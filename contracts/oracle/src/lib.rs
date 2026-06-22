#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env, Symbol};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum OracleError {
    PriceNotFound = 1,
    Unauthorized = 2,
    InvalidPrice = 3,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    OracleAdmin,
    Price(Symbol),
}

#[contract]
pub struct OracleContract;

#[contractimpl]
impl OracleContract {
    pub fn init(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::OracleAdmin) {
            panic!("Oracle already initialized");
        }
        env.storage().instance().set(&DataKey::OracleAdmin, &admin);
    }

    pub fn set_price(
        env: Env,
        caller: Address,
        asset: Symbol,
        price: i128,
    ) -> Result<(), OracleError> {
        caller.require_auth();

        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::OracleAdmin)
            .unwrap_or_else(|| panic!("Oracle not initialized"));

        if caller != admin {
            return Err(OracleError::Unauthorized);
        }

        if price < 1 {
            return Err(OracleError::InvalidPrice);
        }

        env.storage()
            .persistent()
            .set(&DataKey::Price(asset.clone()), &price);
        Ok(())
    }

    pub fn get_price(env: Env, asset: Symbol) -> Result<i128, OracleError> {
        env.storage()
            .persistent()
            .get(&DataKey::Price(asset))
            .ok_or(OracleError::PriceNotFound)
    }
}
