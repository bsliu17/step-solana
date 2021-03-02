use solana_program::program_error::ProgramError;
use std::convert::TryInto;

use crate::error::StepError::InvalidInstruction;

pub enum StepInstruction {
    /// One-time initialization called by the deployer to set some global program states
    ///
    ///
    /// Accounts expected:
    ///
    /// 0. `[signer]` The account of deployer.
    /// 1. `[writable]` The program state account. This is a PDA and the account is created inside the instruction.
    /// 2. `[]` System Program.
    /// 3. `[]` Rent sysvar.
    InitProgram {
    },
    /// One-time initialization per pool
    ///
    ///
    /// Accounts expected:
    ///
    /// 0. `[signer]` The account of deployer.
    /// 1. `[]` The program state account. This is a PDA.
    /// 2. `[writable]` The pool state account. This is a PDA.
    /// 3. `[]` System Program.
    /// 4. `[]` Token Program.
    /// 5. `[]` Rent sysvar.
    InitPool {
        pda_seed: [u8; 32]
    },
    /// Deposits a token by transferring it from the user to a token account owned by the PDA for a specified pool.
    ///
    ///
    /// Accounts expected:
    ///
    /// 0. `[signer]` The account of the user depositing funds.
    /// 1. `[]` Depositors token account where source of funds come from.
    /// 2. `[writable]` The PDA of pool state account.
    /// 3. `[writable]` The PDA of the pools token account.
    /// 4. `[]` Token Program.
    Deposit {
        /// The amount user wants to deposit
        amount: u64,
    },
    /// Execute a trade
    ///
    ///
    /// Accounts expected:
    ///
    /// 0. `[signer]` The account of deployer.
    /// 1. `[]` The PDA of program state account.
    /// 2. `[writable]` The PDA of the pools token account.
    /// 3. `[]` Mint.
    /// 4. `[]` System Program.
    /// 5. `[]` Token Program.
    /// 6. `[]` Rent sysvar.
    Execute {
        pda_seed: [u8; 32]
    }
}

impl StepInstruction {
    /// Unpacks a byte buffer into a [StepInstruction](enum.StepInstruction.html).
    pub fn unpack(input: &[u8]) -> Result<Self, ProgramError> {
        let (tag, rest) = input.split_first().ok_or(InvalidInstruction)?;

        Ok(match tag {
            0 => Self::InitProgram {
            },
            1 => Self::InitPool {
                pda_seed: Self::unpack_pda_seed(rest)?
            },
            2 => Self::Deposit {
                amount: Self::unpack_amount(rest)?,
            },
            3 => Self::Execute {
                pda_seed: Self::unpack_pda_seed(rest)?
            },
            _ => return Err(InvalidInstruction.into()),
        })
    }

    fn unpack_amount(input: &[u8]) -> Result<u64, ProgramError> {
        let amount = input
            .get(..8)
            .and_then(|slice| slice.try_into().ok())
            .map(u64::from_le_bytes)
            .ok_or(InvalidInstruction)?;
        Ok(amount)
    }

    fn unpack_pda_seed(input: &[u8]) -> Result<[u8; 32], ProgramError> {
        let amount = input
            .get(..32)
            .and_then(|slice| slice.try_into().ok())
            .ok_or(InvalidInstruction)?;
        Ok(amount)
    }
}