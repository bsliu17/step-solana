use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};
use solana_program::{
    clock::UnixTimestamp,
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack, Sealed},
    pubkey::Pubkey,
    msg
};

use std::mem::size_of;

// Wrapper for Pubkey for use with Borsh
pub type PubkeyData = [u8; 32];

#[derive(Clone, Debug, BorshSerialize, BorshDeserialize, BorshSchema, PartialEq)]
pub struct StepProgramState {
    pub is_initialized: bool,
    pub deployer_pubkey: [u8; 32]
}

impl Sealed for StepProgramState {}

impl IsInitialized for StepProgramState {
    fn is_initialized(&self) -> bool {
        self.is_initialized
    }
}

impl Pack for StepProgramState {
    const LEN: usize = 33;

    fn pack_into_slice(&self, dst: &mut [u8]) {
        let data = self.try_to_vec().unwrap();
        dst[..data.len()].copy_from_slice(&data);
    }

    fn unpack_from_slice(src: &[u8]) -> Result<Self, ProgramError> {
        let mut mut_src: &[u8] = src;
        Self::deserialize(&mut mut_src).map_err(|err| {
            msg!(
                "Error: failed to deserialize program state account: {}",
                err
            );
            ProgramError::InvalidAccountData
        })
    }
}

#[derive(Clone, Debug, BorshSerialize, BorshDeserialize, BorshSchema, PartialEq)]
pub struct Stream {
    pub input_token_pubkey: PubkeyData,
    pub output_token_pubkey: PubkeyData,
    pub next_stream: PubkeyData,
    pub interval_days: UnixTimestamp,
    pub amount: u64
}

impl Stream {
    pub fn new(input_token_pubkey: PubkeyData,
               output_token_pubkey: PubkeyData,
               next_stream: PubkeyData,
               interval_days: UnixTimestamp,
               amount: u64) -> Self {
        Self {
            input_token_pubkey: input_token_pubkey,
            output_token_pubkey: output_token_pubkey,
            next_stream: next_stream,
            interval_days: interval_days,
            amount: amount
        }
    }
}

impl Sealed for Stream {}

impl Pack for Stream {
    const LEN: usize = 8;

    fn pack_into_slice(&self, dst: &mut [u8]) {
        let data = self.try_to_vec().unwrap();
        dst[..data.len()].copy_from_slice(&data);
    }

    fn unpack_from_slice(src: &[u8]) -> Result<Self, ProgramError> {
        let mut mut_src: &[u8] = src;
        Self::deserialize(&mut mut_src).map_err(|err| {
            msg!(
                "Error: failed to deserialize user account: {}",
                err
            );
            ProgramError::InvalidAccountData
        })
    }
}

#[derive(Clone, Debug, BorshSerialize, BorshDeserialize, BorshSchema, PartialEq)]
pub struct UserAccount {
    pub balance: u64,
    pub next_user: PubkeyData,
    pub head_stream: PubkeyData,
}

impl UserAccount {
    pub fn new() -> Self {
        Self {
            balance: 0,
            next_user: [0; size_of::<PubkeyData>()],
            head_stream: [0; size_of::<PubkeyData>()]
        }
    }
}

impl Sealed for UserAccount {}

impl Pack for UserAccount {
    const LEN: usize = 8;

    fn pack_into_slice(&self, dst: &mut [u8]) {
        let data = self.try_to_vec().unwrap();
        dst[..data.len()].copy_from_slice(&data);
    }

    fn unpack_from_slice(src: &[u8]) -> Result<Self, ProgramError> {
        let mut mut_src: &[u8] = src;
        Self::deserialize(&mut mut_src).map_err(|err| {
            msg!(
                "Error: failed to deserialize user account: {}",
                err
            );
            ProgramError::InvalidAccountData
        })
    }
}


pub const MAX_SEED_SIZE_BYTES: usize = 32;

#[derive(Clone, Debug, BorshSerialize, BorshDeserialize, BorshSchema, PartialEq)]
pub struct Pool {
    pub is_initialized: bool,
    pub mint_pubkey: PubkeyData,
    pub pda_seed: [u8; MAX_SEED_SIZE_BYTES],
    pub head_user: PubkeyData
}

impl Sealed for Pool {}

impl Pack for Pool {
    const LEN: usize = (1 + 32 + 32 + 12);

    fn pack_into_slice(&self, dst: &mut [u8]) {
        let data = self.try_to_vec().unwrap();
        dst[..data.len()].copy_from_slice(&data);
    }

    fn unpack_from_slice(src: &[u8]) -> Result<Self, ProgramError> {
        let mut mut_src: &[u8] = src;
        Self::deserialize(&mut mut_src).map_err(|err| {
            msg!(
                "Error: failed to deserialize pool account: {}",
                err
            );
            ProgramError::InvalidAccountData
        })
    }
}