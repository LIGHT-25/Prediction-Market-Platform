#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, token, Address, Env, String, Symbol, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum MarketError {
    MarketNotFound = 1,
    AlreadyResolved = 2,
    MarketNotExpired = 3,
    NoOracle = 4,
    InvalidOracle = 5,
    OracleCallFailed = 6,
    Unauthorized = 7,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    MarketCount,
    Market(u32),
    UserPosition(u32, Address),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Market {
    pub id: u32,
    pub question: String,
    pub description: String,
    pub creator: Address,
    pub expiration_date: u64,
    pub total_yes_shares: i128,
    pub total_no_shares: i128,
    pub resolved: bool,
    pub outcome: bool,
    pub token: Address,
    pub participants: u32,
    pub oracle_id: Option<Address>,
    pub oracle_asset: Option<Symbol>,
    pub resolution_price_threshold: Option<i128>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserPosition {
    pub yes_shares: i128,
    pub no_shares: i128,
    pub claimed: bool,
}

#[soroban_sdk::contractclient(name = "OracleContractClient")]
pub trait OracleContractTrait {
    fn get_price(env: Env, asset: Symbol) -> i128;
}

#[contract]
pub struct PredictionMarketContract;

#[contractimpl]
impl PredictionMarketContract {
    pub fn create_market(
        env: Env,
        creator: Address,
        question: String,
        description: String,
        expiration_date: u64,
        token: Address,
    ) -> u32 {
        creator.require_auth();

        let mut count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::MarketCount)
            .unwrap_or(0);
        count += 1;
        env.storage().instance().set(&DataKey::MarketCount, &count);

        let market = Market {
            id: count,
            question: question.clone(),
            description,
            creator: creator.clone(),
            expiration_date,
            total_yes_shares: 0,
            total_no_shares: 0,
            resolved: false,
            outcome: false,
            token: token.clone(),
            participants: 0,
            oracle_id: None,
            oracle_asset: None,
            resolution_price_threshold: None,
        };

        env.storage()
            .instance()
            .set(&DataKey::Market(count), &market);

        env.events().publish(
            (Symbol::new(&env, "MarketCreated"), count),
            (creator, question, expiration_date, token),
        );

        count
    }

    pub fn create_market_with_oracle(
        env: Env,
        creator: Address,
        question: String,
        description: String,
        expiration_date: u64,
        token: Address,
        oracle_contract_id: Address,
        oracle_asset: Symbol,
        resolution_price_threshold: i128,
    ) -> Result<u32, MarketError> {
        creator.require_auth();

        // Validate oracle address
        if oracle_contract_id == env.current_contract_address() {
            return Err(MarketError::InvalidOracle);
        }

        let mut count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::MarketCount)
            .unwrap_or(0);
        count += 1;
        env.storage().instance().set(&DataKey::MarketCount, &count);

        let market = Market {
            id: count,
            question: question.clone(),
            description,
            creator: creator.clone(),
            expiration_date,
            total_yes_shares: 0,
            total_no_shares: 0,
            resolved: false,
            outcome: false,
            token: token.clone(),
            participants: 0,
            oracle_id: Some(oracle_contract_id),
            oracle_asset: Some(oracle_asset),
            resolution_price_threshold: Some(resolution_price_threshold),
        };

        env.storage()
            .instance()
            .set(&DataKey::Market(count), &market);

        // Emit (Symbol("MarketCreated"), market_id) with data payload (creator, question, expiration_date, token)
        env.events().publish(
            (Symbol::new(&env, "MarketCreated"), count),
            (creator, question, expiration_date, token),
        );

        Ok(count)
    }

    pub fn auto_resolve_market(env: Env, market_id: u32) -> Result<(), MarketError> {
        let market_key = DataKey::Market(market_id);
        let mut market: Market = env
            .storage()
            .instance()
            .get(&market_key)
            .ok_or(MarketError::MarketNotFound)?;

        if market.resolved {
            return Err(MarketError::AlreadyResolved);
        }

        let current_time = env.ledger().timestamp();
        if current_time < market.expiration_date {
            return Err(MarketError::MarketNotExpired);
        }

        let oracle_id = market.oracle_id.clone().ok_or(MarketError::NoOracle)?;
        let oracle_asset = market.oracle_asset.clone().ok_or(MarketError::NoOracle)?;
        let threshold = market
            .resolution_price_threshold
            .ok_or(MarketError::NoOracle)?;

        let client = OracleContractClient::new(&env, &oracle_id);
        let price_result = client.try_get_price(&oracle_asset);
        let price = match price_result {
            Ok(Ok(p)) => p,
            _ => return Err(MarketError::OracleCallFailed),
        };

        let outcome = price >= threshold;
        market.resolved = true;
        market.outcome = outcome;
        env.storage().instance().set(&market_key, &market);

        // Emit (Symbol("MarketAutoResolved"), market_id) with data payload (oracle_price, outcome)
        env.events().publish(
            (Symbol::new(&env, "MarketAutoResolved"), market_id),
            (price, outcome),
        );

        Ok(())
    }

    pub fn place_bet(env: Env, market_id: u32, user: Address, is_yes: bool, amount: i128) {
        user.require_auth();

        if amount <= 0 {
            panic!("Bet amount must be greater than zero");
        }

        let market_key = DataKey::Market(market_id);
        let mut market: Market = env
            .storage()
            .instance()
            .get(&market_key)
            .unwrap_or_else(|| panic!("Market not found"));

        if market.resolved {
            panic!("Market is already resolved");
        }

        let current_time = env.ledger().timestamp();
        if current_time >= market.expiration_date {
            panic!("Market has expired");
        }

        let token_client = token::Client::new(&env, &market.token);
        token_client.transfer(&user, &env.current_contract_address(), &amount);

        if is_yes {
            market.total_yes_shares += amount;
        } else {
            market.total_no_shares += amount;
        }

        let position_key = DataKey::UserPosition(market_id, user.clone());
        let mut position: UserPosition =
            env.storage()
                .persistent()
                .get(&position_key)
                .unwrap_or(UserPosition {
                    yes_shares: 0,
                    no_shares: 0,
                    claimed: false,
                });

        if position.yes_shares == 0 && position.no_shares == 0 {
            market.participants += 1;
        }

        if is_yes {
            position.yes_shares += amount;
        } else {
            position.no_shares += amount;
        }
        env.storage().persistent().set(&position_key, &position);
        env.storage().instance().set(&market_key, &market);

        // Updated event: topic (Symbol("BetPlaced"), market_id), data (user, is_yes, amount)
        env.events().publish(
            (Symbol::new(&env, "BetPlaced"), market_id),
            (user, is_yes, amount),
        );
    }

    pub fn get_market(env: Env, market_id: u32) -> Option<Market> {
        env.storage().instance().get(&DataKey::Market(market_id))
    }

    pub fn get_all_markets(env: Env) -> Vec<Market> {
        let mut markets = Vec::new(&env);
        let count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::MarketCount)
            .unwrap_or(0);
        for i in 1..=count {
            if let Some(market) = env
                .storage()
                .instance()
                .get::<_, Market>(&DataKey::Market(i))
            {
                markets.push_back(market);
            }
        }
        markets
    }

    pub fn resolve_market(env: Env, market_id: u32, outcome: bool) {
        let market_key = DataKey::Market(market_id);
        let mut market: Market = env
            .storage()
            .instance()
            .get(&market_key)
            .unwrap_or_else(|| panic!("Market not found"));

        market.creator.require_auth();

        if market.resolved {
            panic!("Market is already resolved");
        }

        let current_time = env.ledger().timestamp();
        if current_time < market.expiration_date {
            panic!("Market cannot be resolved before its expiration date");
        }

        market.resolved = true;
        market.outcome = outcome;
        env.storage().instance().set(&market_key, &market);

        // Updated event: topic (Symbol("MarketResolved"), market_id), data (creator, outcome)
        env.events().publish(
            (Symbol::new(&env, "MarketResolved"), market_id),
            (market.creator.clone(), outcome),
        );
    }

    pub fn claim_reward(env: Env, market_id: u32, user: Address) {
        user.require_auth();

        let market_key = DataKey::Market(market_id);
        let market: Market = env
            .storage()
            .instance()
            .get(&market_key)
            .unwrap_or_else(|| panic!("Market not found"));

        if !market.resolved {
            panic!("Market is not resolved yet");
        }

        let position_key = DataKey::UserPosition(market_id, user.clone());
        let mut position: UserPosition = env
            .storage()
            .persistent()
            .get(&position_key)
            .unwrap_or_else(|| panic!("No position found for user"));

        if position.claimed {
            panic!("Reward has already been claimed");
        }

        let total_pool = market.total_yes_shares + market.total_no_shares;
        let reward: i128;

        if market.outcome {
            if market.total_yes_shares == 0 {
                reward = position.no_shares;
            } else {
                reward = (position.yes_shares * total_pool) / market.total_yes_shares;
            }
        } else {
            if market.total_no_shares == 0 {
                reward = position.yes_shares;
            } else {
                reward = (position.no_shares * total_pool) / market.total_no_shares;
            }
        }

        if reward > 0 {
            let token_client = token::Client::new(&env, &market.token);
            token_client.transfer(&env.current_contract_address(), &user, &reward);
        }

        position.claimed = true;
        env.storage().persistent().set(&position_key, &position);

        // Updated event: topic (Symbol("RewardClaimed"), market_id), data (user, reward)
        env.events().publish(
            (Symbol::new(&env, "RewardClaimed"), market_id),
            (user, reward),
        );
    }

    pub fn get_user_position(env: Env, market_id: u32, user: Address) -> UserPosition {
        let position_key = DataKey::UserPosition(market_id, user);
        env.storage()
            .persistent()
            .get(&position_key)
            .unwrap_or(UserPosition {
                yes_shares: 0,
                no_shares: 0,
                claimed: false,
            })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use oracle::OracleContract;
    use soroban_sdk::testutils::{Address as _, Ledger, LedgerInfo};
    use soroban_sdk::{token, Address, Env, String, Symbol};

    fn setup_test<'a>() -> (
        Env,
        PredictionMarketContractClient<'a>,
        Address,
        Address,
        token::Client<'a>,
        token::StellarAssetContractClient<'a>,
    ) {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, PredictionMarketContract);
        let client = PredictionMarketContractClient::new(&env, &contract_id);

        let creator = Address::generate(&env);
        let token_admin = Address::generate(&env);
        let token_address = env.register_stellar_asset_contract(token_admin.clone());
        let token_client = token::Client::new(&env, &token_address);
        let token_admin_client = token::StellarAssetContractClient::new(&env, &token_address);

        (
            env,
            client,
            contract_id,
            creator,
            token_client,
            token_admin_client,
        )
    }

    #[test]
    fn test_create_market() {
        let (env, client, _, creator, token_client, _) = setup_test();

        let q = String::from_str(&env, "Will Stellar hit $1?");
        let d = String::from_str(&env, "Test question");
        let exp = 1000u64;

        let id1 = client.create_market(&creator, &q, &d, &exp, &token_client.address);
        assert_eq!(id1, 1);

        let id2 = client.create_market(&creator, &q, &d, &exp, &token_client.address);
        assert_eq!(id2, 2);

        let market = client.get_market(&1).unwrap();
        assert_eq!(market.id, 1);
        assert_eq!(market.question, q);
    }

    #[test]
    fn test_place_bet_accounting() {
        let (env, client, contract_address, creator, token_client, token_admin) = setup_test();

        let user = Address::generate(&env);
        token_admin.mint(&user, &1000);

        let q = String::from_str(&env, "Stellar $1?");
        let d = String::from_str(&env, "Desc");
        let exp = 1000u64;
        let id = client.create_market(&creator, &q, &d, &exp, &token_client.address);

        // Before bet
        assert_eq!(token_client.balance(&user), 1000);
        assert_eq!(token_client.balance(&contract_address), 0);

        client.place_bet(&id, &user, &true, &400);

        // After bet
        assert_eq!(token_client.balance(&user), 600);
        assert_eq!(token_client.balance(&contract_address), 400);

        let market = client.get_market(&id).unwrap();
        assert_eq!(market.total_yes_shares, 400);
        assert_eq!(market.total_no_shares, 0);

        let pos = client.get_user_position(&id, &user);
        assert_eq!(pos.yes_shares, 400);
        assert_eq!(pos.no_shares, 0);
    }

    #[test]
    #[should_panic(expected = "Market has expired")]
    fn test_place_bet_expired() {
        let (env, client, _, creator, token_client, token_admin) = setup_test();
        let user = Address::generate(&env);
        token_admin.mint(&user, &1000);

        let exp = 1000u64;
        let id = client.create_market(
            &creator,
            &String::from_str(&env, "Q"),
            &String::from_str(&env, "D"),
            &exp,
            &token_client.address,
        );

        // Set ledger timestamp past expiration date
        env.ledger().set(LedgerInfo {
            timestamp: 1001,
            protocol_version: 21,
            sequence_number: 100,
            network_id: [0; 32],
            base_reserve: 0,
            min_temp_entry_ttl: 0,
            min_persistent_entry_ttl: 0,
        });

        client.place_bet(&id, &user, &true, &100);
    }

    #[test]
    #[should_panic(expected = "Market is already resolved")]
    fn test_place_bet_resolved() {
        let (env, client, _, creator, token_client, token_admin) = setup_test();
        let user = Address::generate(&env);
        token_admin.mint(&user, &1000);

        let exp = 1000u64;
        let id = client.create_market(
            &creator,
            &String::from_str(&env, "Q"),
            &String::from_str(&env, "D"),
            &exp,
            &token_client.address,
        );

        // Resolve market
        env.ledger().set(LedgerInfo {
            timestamp: 1001,
            protocol_version: 21,
            sequence_number: 100,
            network_id: [0; 32],
            base_reserve: 0,
            min_temp_entry_ttl: 0,
            min_persistent_entry_ttl: 0,
        });
        client.resolve_market(&id, &true);

        client.place_bet(&id, &user, &true, &100);
    }

    #[test]
    #[should_panic(expected = "Bet amount must be greater than zero")]
    fn test_place_bet_zero_amount() {
        let (env, client, _, creator, token_client, _) = setup_test();
        let user = Address::generate(&env);
        let id = client.create_market(
            &creator,
            &String::from_str(&env, "Q"),
            &String::from_str(&env, "D"),
            &1000,
            &token_client.address,
        );
        client.place_bet(&id, &user, &true, &0);
    }

    #[test]
    #[should_panic(expected = "Market cannot be resolved before its expiration date")]
    fn test_resolve_before_expiry() {
        let (env, client, _, creator, token_client, _) = setup_test();
        let id = client.create_market(
            &creator,
            &String::from_str(&env, "Q"),
            &String::from_str(&env, "D"),
            &1000,
            &token_client.address,
        );
        client.resolve_market(&id, &true);
    }

    #[test]
    #[should_panic]
    fn test_resolve_market_unauthorized() {
        let env = Env::default();
        let contract_id = env.register_contract(None, PredictionMarketContract);
        let client = PredictionMarketContractClient::new(&env, &contract_id);

        let creator = Address::generate(&env);
        let token_admin = Address::generate(&env);
        let token_address = env.register_stellar_asset_contract(token_admin.clone());
        let token_client = token::Client::new(&env, &token_address);

        env.mock_all_auths();
        let id = client.create_market(
            &creator,
            &String::from_str(&env, "Q"),
            &String::from_str(&env, "D"),
            &1000,
            &token_client.address,
        );

        env.ledger().set(LedgerInfo {
            timestamp: 1001,
            protocol_version: 21,
            sequence_number: 100,
            network_id: [0; 32],
            base_reserve: 0,
            min_temp_entry_ttl: 0,
            min_persistent_entry_ttl: 0,
        });

        // This should panic without creator signing/mock auths
        let env_no_auth = Env::default();
        let client_no_auth = PredictionMarketContractClient::new(&env_no_auth, &contract_id);
        client_no_auth.resolve_market(&id, &true);
    }

    #[test]
    #[should_panic(expected = "Market is not resolved yet")]
    fn test_claim_unresolved() {
        let (env, client, _, creator, token_client, _) = setup_test();
        let user = Address::generate(&env);
        let id = client.create_market(
            &creator,
            &String::from_str(&env, "Q"),
            &String::from_str(&env, "D"),
            &1000,
            &token_client.address,
        );
        client.claim_reward(&id, &user);
    }

    #[test]
    #[should_panic(expected = "Reward has already been claimed")]
    fn test_claim_double() {
        let (env, client, _, creator, token_client, token_admin) = setup_test();
        let user = Address::generate(&env);
        token_admin.mint(&user, &1000);

        let id = client.create_market(
            &creator,
            &String::from_str(&env, "Q"),
            &String::from_str(&env, "D"),
            &1000,
            &token_client.address,
        );
        client.place_bet(&id, &user, &true, &100);

        env.ledger().set(LedgerInfo {
            timestamp: 1001,
            protocol_version: 21,
            sequence_number: 100,
            network_id: [0; 32],
            base_reserve: 0,
            min_temp_entry_ttl: 0,
            min_persistent_entry_ttl: 0,
        });
        client.resolve_market(&id, &true);

        client.claim_reward(&id, &user.clone());
        client.claim_reward(&id, &user);
    }

    #[test]
    fn test_reward_distribution() {
        let (env, client, _, creator, token_client, token_admin) = setup_test();

        let user_yes = Address::generate(&env);
        let user_no = Address::generate(&env);

        token_admin.mint(&user_yes, &1000);
        token_admin.mint(&user_no, &1000);

        let id = client.create_market(
            &creator,
            &String::from_str(&env, "Q"),
            &String::from_str(&env, "D"),
            &1000,
            &token_client.address,
        );

        client.place_bet(&id, &user_yes, &true, &300);
        client.place_bet(&id, &user_no, &false, &700);

        env.ledger().set(LedgerInfo {
            timestamp: 1001,
            protocol_version: 21,
            sequence_number: 100,
            network_id: [0; 32],
            base_reserve: 0,
            min_temp_entry_ttl: 0,
            min_persistent_entry_ttl: 0,
        });
        client.resolve_market(&id, &true);

        client.claim_reward(&id, &user_yes.clone());
        assert_eq!(token_client.balance(&user_yes), 700 + 1000);
    }

    #[test]
    fn test_property_3_oracle_persisted() {
        let (env, client, _, creator, token_client, _) = setup_test();

        let oracle1 = Address::generate(&env);
        let oracle2 = Address::generate(&env);
        let oracle3 = Address::generate(&env);

        let asset1 = Symbol::new(&env, "XLM");
        let asset2 = Symbol::new(&env, "BTC");
        let asset3 = Symbol::new(&env, "ETH");

        let id1 = client
            .create_market_with_oracle(
                &creator,
                &String::from_str(&env, "Q1"),
                &String::from_str(&env, "D"),
                &1000,
                &token_client.address,
                &oracle1,
                &asset1,
                &500,
            )
            .unwrap();
        let id2 = client
            .create_market_with_oracle(
                &creator,
                &String::from_str(&env, "Q2"),
                &String::from_str(&env, "D"),
                &1000,
                &token_client.address,
                &oracle2,
                &asset2,
                &60000,
            )
            .unwrap();
        let id3 = client
            .create_market_with_oracle(
                &creator,
                &String::from_str(&env, "Q3"),
                &String::from_str(&env, "D"),
                &1000,
                &token_client.address,
                &oracle3,
                &asset3,
                &3500,
            )
            .unwrap();

        let m1 = client.get_market(&id1).unwrap();
        assert_eq!(m1.oracle_id, Some(oracle1));
        assert_eq!(m1.oracle_asset, Some(asset1));
        assert_eq!(m1.resolution_price_threshold, Some(500));

        let m2 = client.get_market(&id2).unwrap();
        assert_eq!(m2.oracle_id, Some(oracle2));
        assert_eq!(m2.oracle_asset, Some(asset2));
        assert_eq!(m2.resolution_price_threshold, Some(60000));

        let m3 = client.get_market(&id3).unwrap();
        assert_eq!(m3.oracle_id, Some(oracle3));
        assert_eq!(m3.oracle_asset, Some(asset3));
        assert_eq!(m3.resolution_price_threshold, Some(3500));
    }

    #[test]
    fn test_property_4_auto_resolve_yes() {
        let (env, client, _, creator, token_client, _) = setup_test();

        let oracle_id = env.register_contract(None, OracleContract);
        let oracle_client = oracle::OracleContractClient::new(&env, &oracle_id);

        let admin = Address::generate(&env);
        oracle_client.init(&admin);

        let asset = Symbol::new(&env, "XLM");
        oracle_client.set_price(&admin, &asset, &600);

        let id = client
            .create_market_with_oracle(
                &creator,
                &String::from_str(&env, "Q"),
                &String::from_str(&env, "D"),
                &1000,
                &token_client.address,
                &oracle_id,
                &asset,
                &500,
            )
            .unwrap();

        env.ledger().set(LedgerInfo {
            timestamp: 1001,
            protocol_version: 21,
            sequence_number: 100,
            network_id: [0; 32],
            base_reserve: 0,
            min_temp_entry_ttl: 0,
            min_persistent_entry_ttl: 0,
        });

        client.auto_resolve_market(&id).unwrap();

        let market = client.get_market(&id).unwrap();
        assert!(market.resolved);
        assert!(market.outcome);
    }

    #[test]
    fn test_property_4_auto_resolve_no() {
        let (env, client, _, creator, token_client, _) = setup_test();

        let oracle_id = env.register_contract(None, OracleContract);
        let oracle_client = oracle::OracleContractClient::new(&env, &oracle_id);

        let admin = Address::generate(&env);
        oracle_client.init(&admin);

        let asset = Symbol::new(&env, "XLM");
        oracle_client.set_price(&admin, &asset, &400);

        let id = client
            .create_market_with_oracle(
                &creator,
                &String::from_str(&env, "Q"),
                &String::from_str(&env, "D"),
                &1000,
                &token_client.address,
                &oracle_id,
                &asset,
                &500,
            )
            .unwrap();

        env.ledger().set(LedgerInfo {
            timestamp: 1001,
            protocol_version: 21,
            sequence_number: 100,
            network_id: [0; 32],
            base_reserve: 0,
            min_temp_entry_ttl: 0,
            min_persistent_entry_ttl: 0,
        });

        client.auto_resolve_market(&id).unwrap();

        let market = client.get_market(&id).unwrap();
        assert!(market.resolved);
        assert!(!market.outcome);
    }

    #[test]
    fn test_property_5_events_topic_length() {
        let (env, client, _, creator, token_client, token_admin) = setup_test();
        let user = Address::generate(&env);
        token_admin.mint(&user, &1000);

        let id = client.create_market(
            &creator,
            &String::from_str(&env, "Q"),
            &String::from_str(&env, "D"),
            &1000,
            &token_client.address,
        );
        let events = env.events().all();
        let last_event = events.last().unwrap();
        assert_eq!(last_event.1.len(), 2);

        client.place_bet(&id, &user, &true, &100);
        let events = env.events().all();
        let last_event = events.last().unwrap();
        assert_eq!(last_event.1.len(), 2);

        env.ledger().set(LedgerInfo {
            timestamp: 1001,
            protocol_version: 21,
            sequence_number: 100,
            network_id: [0; 32],
            base_reserve: 0,
            min_temp_entry_ttl: 0,
            min_persistent_entry_ttl: 0,
        });
        client.resolve_market(&id, &true);
        let events = env.events().all();
        let last_event = events.last().unwrap();
        assert_eq!(last_event.1.len(), 2);

        client.claim_reward(&id, &user);
        let events = env.events().all();
        let last_event = events.last().unwrap();
        assert_eq!(last_event.1.len(), 2);
    }
}
