#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, Env, String, Symbol, Vec,
};

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
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserPosition {
    pub yes_shares: i128,
    pub no_shares: i128,
    pub claimed: bool,
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

        let mut count: u32 = env.storage().instance().get(&DataKey::MarketCount).unwrap_or(0);
        count += 1;
        env.storage().instance().set(&DataKey::MarketCount, &count);

        let market = Market {
            id: count,
            question: question.clone(),
            description: description.clone(),
            creator: creator.clone(),
            expiration_date,
            total_yes_shares: 0,
            total_no_shares: 0,
            resolved: false,
            outcome: false,
            token: token.clone(),
            participants: 0,
        };

        env.storage().instance().set(&DataKey::Market(count), &market);

        env.events().publish(
            (Symbol::new(&env, "MarketCreated"), count, creator),
            (question, description, expiration_date, token),
        );

        count
    }

    pub fn place_bet(
        env: Env,
        market_id: u32,
        user: Address,
        is_yes: bool,
        amount: i128,
    ) {
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
        let mut position: UserPosition = env
            .storage()
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

        env.events().publish(
            (Symbol::new(&env, "BetPlaced"), market_id, user),
            (is_yes, amount),
        );
    }

    pub fn get_market(env: Env, market_id: u32) -> Option<Market> {
        env.storage().instance().get(&DataKey::Market(market_id))
    }

    pub fn get_all_markets(env: Env) -> Vec<Market> {
        let mut markets = Vec::new(&env);
        let count: u32 = env.storage().instance().get(&DataKey::MarketCount).unwrap_or(0);
        for i in 1..=count {
            if let Some(market) = env.storage().instance().get::<_, Market>(&DataKey::Market(i)) {
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

        env.events().publish(
            (Symbol::new(&env, "MarketResolved"), market_id),
            outcome,
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

        env.events().publish(
            (Symbol::new(&env, "RewardClaimed"), market_id, user),
            reward,
        );
    }

    pub fn get_user_position(env: Env, market_id: u32, user: Address) -> UserPosition {
        let position_key = DataKey::UserPosition(market_id, user);
        env.storage().persistent().get(&position_key).unwrap_or(UserPosition {
            yes_shares: 0,
            no_shares: 0,
            claimed: false,
        })
    }
}
