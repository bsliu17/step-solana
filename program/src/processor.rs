use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack},
    pubkey::Pubkey,
    sysvar::{rent::Rent, Sysvar},
    system_instruction,
    native_token::sol_to_lamports
};

use spl_token::state::Account as TokenAccount;

use crate::{
    error::StepError,
    instruction::StepInstruction,
    state::StepProgramState,
    state::Pool,
    state::MAX_SEED_SIZE_BYTES,
    state::UserAccount
};

pub struct Processor;
impl Processor {
    pub fn process(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        instruction_data: &[u8],
    ) -> ProgramResult {
        let instruction = StepInstruction::unpack(instruction_data)?;

        match instruction {
            StepInstruction::InitProgram { } => {
                msg!("Instruction: InitProgram");
                Self::process_init_program(accounts, program_id)
            }
            StepInstruction::InitPool { pda_seed } => {
                msg!("Instruction: InitPool");
                Self::process_init_pool(accounts, program_id, pda_seed)
            }
            StepInstruction::Deposit { amount } => {
                msg!("Instruction: Deposit");
                Self::process_deposit(accounts, program_id, amount)
            }
            StepInstruction::Execute { pda_seed } => {
                msg!("Instruction: Execute Trade");
                Self::process_trade(accounts, program_id, pda_seed)
            }
        }
    }

    fn process_init_program(
        accounts: &[AccountInfo],
        program_id: &Pubkey,
    ) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let deployer = next_account_info(account_info_iter)?;
        let program_state_account = next_account_info(account_info_iter)?;
        let system_program_info = next_account_info(account_info_iter)?;
        let rent_sysvar_info = next_account_info(account_info_iter)?;
        let rent = &Rent::from_account_info(rent_sysvar_info)?;

        let seed = b"step_program_state-123456789abcb";
        let (pda, seed_nonce) = Pubkey::find_program_address(&[seed], program_id);

        if pda != *program_state_account.key {
            msg!("Error: program state address derivation mismatch");
            return Err(ProgramError::InvalidArgument);
        }

        // figure this error handling out later
        /*let mut program_state = StepProgramState::unpack(&program_state_account.data.borrow())?;
        if program_state.is_initialized() {
            return Err(ProgramError::AccountAlreadyInitialized);
        }
        program_state.is_initialized = true;
        program_state.deployer_pubkey = *deployer.key;*/

        let program_state_signer_seeds: &[&[_]] = &[
            seed, &[seed_nonce]
        ];

        msg!("Creating program state account");
        invoke_signed(
            &system_instruction::create_account(
                deployer.key,
                program_state_account.key,
                1.max(rent.minimum_balance(StepProgramState::get_packed_len())),
                StepProgramState::get_packed_len() as u64,
                program_id
            ),
            &[
                deployer.clone(),
                program_state_account.clone(),
                system_program_info.clone()
            ],
            &[&program_state_signer_seeds]
        )?;

        StepProgramState {
            is_initialized: true,
            deployer_pubkey: deployer.key.to_bytes()
        }.pack_into_slice(&mut program_state_account.data.borrow_mut());

        Ok(())
    }


    fn process_init_pool(
        accounts: &[AccountInfo],
        program_id: &Pubkey,
        pool_pda_seed: [u8; MAX_SEED_SIZE_BYTES]
    ) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();

        let deployer = next_account_info(account_info_iter)?;
        let program_state_account = next_account_info(account_info_iter)?;
        let pool_account = next_account_info(account_info_iter)?;
        let program_token_account = next_account_info(account_info_iter)?;

        let program_state = StepProgramState::unpack_unchecked(&program_state_account.data.borrow())?;
        let deployer_key: Pubkey = Pubkey::new(&program_state.deployer_pubkey);

        if deployer_key != *deployer.key {
            return Err(ProgramError::MissingRequiredSignature);
        }

        let token_account_seed = b"seedy";
        let (pda_token_account, seed_nonce) = Pubkey::find_program_address(&[token_account_seed], program_id);

        if pda_token_account != *program_token_account.key {
            msg!("Error: program token address derivation mismatch");
            return Err(ProgramError::InvalidArgument);
        }

        let (pda_pool_account, pool_seed_nonce) = Pubkey::find_program_address(&[&pool_pda_seed], program_id);

        if pda_pool_account != *pool_account.key {
            msg!("Error: pool address derivation mismatch");
            return Err(ProgramError::InvalidArgument);
        }

        let mint_info = next_account_info(account_info_iter)?;

        if *mint_info.owner != spl_token::id() {
            return Err(ProgramError::IncorrectProgramId);
        }

        let system_program_info = next_account_info(account_info_iter)?;
        let spl_token_program_info = next_account_info(account_info_iter)?;
        let rent_sysvar_info = next_account_info(account_info_iter)?;
        let rent = &Rent::from_account_info(rent_sysvar_info)?;

        let program_token_signer_seeds: &[&[_]] = &[
            token_account_seed, &[seed_nonce]
        ];

        msg!("Creating token account");
        invoke_signed(
            &system_instruction::create_account(
                deployer.key,
                program_token_account.key,
                1.max(rent.minimum_balance(spl_token::state::Account::get_packed_len())),
                spl_token::state::Account::get_packed_len() as u64,
                &spl_token::id()
            ),
            &[
                deployer.clone(),
                program_token_account.clone(),
                system_program_info.clone()
            ],
            &[&program_token_signer_seeds]
        )?;

        msg!("Initializing token account");
        invoke(
                &spl_token::instruction::initialize_account(
                &spl_token::id(),
                program_token_account.key,
                mint_info.key,
                program_token_account.key,
            )?,
            &[
                program_token_account.clone(),
                mint_info.clone(),
                rent_sysvar_info.clone(),
                spl_token_program_info.clone()
            ]
        )?;

        let pool_signer_seeds: &[&[_]] = &[
            &pool_pda_seed, &[pool_seed_nonce]
        ];

        msg!("Creating pool info account");
        invoke_signed(
            &system_instruction::create_account(
                deployer.key,
                pool_account.key,
                1.max(rent.minimum_balance(Pool::get_packed_len())),
                Pool::get_packed_len() as u64,
                program_id
            ),
            &[
                deployer.clone(),
                pool_account.clone(),
                system_program_info.clone()
            ],
            &[&pool_signer_seeds]
        )?;

        Pool {
            is_initialized: true,
            mint_pubkey: mint_info.key.to_bytes(),
            pda_seed: pool_pda_seed,
            user_account: UserAccount{balance:0}
        }.pack_into_slice(&mut pool_account.data.borrow_mut());

        Ok(())
    }


    fn process_deposit(
        accounts: &[AccountInfo],
        _program_id: &Pubkey,
        amount: u64
    ) -> ProgramResult {

        let account_info_iter = &mut accounts.iter();
        let depositor = next_account_info(account_info_iter)?;

        if !depositor.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }

        let depositor_token_account = next_account_info(account_info_iter)?;
        let pool_info_account = next_account_info(account_info_iter)?;
        let program_token_account = next_account_info(account_info_iter)?;
        let token_program = next_account_info(account_info_iter)?;

        msg!("Transferring {} from {} to {}", amount, depositor_token_account.key, program_token_account.key);
        let transfer_to_initializer_ix = spl_token::instruction::transfer(
            token_program.key,
            depositor_token_account.key,
            program_token_account.key,
            depositor.key,
            &[&depositor.key],
            amount,
        )?;

        msg!("Calling the token program to transfer tokens to the program...");
        invoke(
            &transfer_to_initializer_ix,
            &[
                depositor_token_account.clone(),
                program_token_account.clone(),
                depositor.clone(),
                token_program.clone(),
            ],
        )?;

        let mut pool_state = Pool::unpack_unchecked(&pool_info_account.data.borrow())?;
        pool_state.user_account.balance += amount;
        Pool::pack(pool_state, &mut pool_info_account.data.borrow_mut())?;

        Ok(())
    }

    fn process_trade(
        accounts: &[AccountInfo],
        program_id: &Pubkey,
        pool_pda_seed: [u8; MAX_SEED_SIZE_BYTES]
    ) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();

        let token_account_seed = b"seedy";
        let (pda_token_account, seed_nonce) = Pubkey::find_program_address(&[token_account_seed], program_id);

        let deployer = next_account_info(account_info_iter)?;
        let program_token_account = next_account_info(account_info_iter)?;
        let token_swap_program = next_account_info(account_info_iter)?;
        let token_program = next_account_info(account_info_iter)?;
        let step_program = next_account_info(account_info_iter)?;
        let swap_info = next_account_info(account_info_iter)?;
        let authority_info = next_account_info(account_info_iter)?;
        //let user_transfer_authority_info = next_account_info(account_info_iter)?;
        //let source_info = next_account_info(account_info_iter)?;
        let swap_source_info = next_account_info(account_info_iter)?;
        let swap_destination_info = next_account_info(account_info_iter)?;
        let destination_info = next_account_info(account_info_iter)?;
        let pool_mint_info = next_account_info(account_info_iter)?;
        let pool_fee_account_info = next_account_info(account_info_iter)?;

        let host_fee_account: std::option::Option<&Pubkey> = None;


        /*msg!("deployer: {}", deployer.key);
        msg!("program_token_account: {}", deployer.key);
        msg!("pda_token_account: {}", pda_token_account);
        msg!("token_swap_program: {}", token_swap_program.key);
        msg!("token_program: {}", token_program.key);
        msg!("authority_info: {}", authority_info.key);
        msg!("swap_source_info: {}", swap_source_info.key);
        msg!("swap_destination_info: {}", swap_destination_info.key);
        msg!("destination_info: {}", destination_info.key);
        msg!("pool_mint_info: {}", pool_mint_info.key);
        msg!("pool_fee_account_info: {}", pool_fee_account_info.key);*/

        let trade_amount: u64 = sol_to_lamports(2.0);


        let signer_seeds: &[&[_]] = &[
            token_account_seed, &[seed_nonce]
        ];

       // msg!("Approving transfer");
        let approve_ix = spl_token::instruction::approve(
            &spl_token::id(),
            &program_token_account.key,
            &token_swap_program.key,
            &pda_token_account,
            &[],
            trade_amount,
        ).unwrap();

        //msg!("Calling the token program");
        invoke_signed(
            &approve_ix,
            &[
                deployer.clone(),
                program_token_account.clone(),
                token_swap_program.clone(),
                token_program.clone()
            ],
            &[&signer_seeds]
        )?;

        //msg!("Creating swap instruction");
        let swap = spl_token_swap::instruction::Swap {
            amount_in: trade_amount,
            minimum_amount_out: sol_to_lamports(1.0)
        };
        let swap_ix = spl_token_swap::instruction::swap(
            token_swap_program.key,
            token_program.key,
            swap_info.key,
            authority_info.key,
            &pda_token_account,
            &program_token_account.key,
            swap_source_info.key,
            swap_destination_info.key,
            destination_info.key,
            pool_mint_info.key,
            pool_fee_account_info.key,
            host_fee_account,
            swap
        )?;

        //msg!("Calling the token swap program");
        invoke_signed(
            &swap_ix,
            &[
                deployer.clone(),
                step_program.clone(),
                token_swap_program.clone(),
                token_program.clone(),
                authority_info.clone(),
                swap_info.clone(),
                program_token_account.clone(),
                swap_source_info.clone(),
                swap_destination_info.clone(),
                destination_info.clone(),
                pool_mint_info.clone(),
                pool_fee_account_info.clone()
            ],
            &[&signer_seeds]
        )?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::instruction::*;
    use solana_program::{
        account_info::IntoAccountInfo, clock::Epoch, instruction::Instruction, sysvar::rent,
    };
    use solana_sdk::account::{
        create_account, create_is_signer_account_infos, Account as SolanaAccount,
    };

    fn do_process_instruction(
        instruction: Instruction,
        accounts: Vec<&mut SolanaAccount>,
    ) -> ProgramResult {
        let mut meta = instruction
            .accounts
            .iter()
            .zip(accounts)
            .map(|(account_meta, account)| (&account_meta.pubkey, account_meta.is_signer, account))
            .collect::<Vec<_>>();

        let account_infos = create_is_signer_account_infos(&mut meta);
        Processor::process(&instruction.program_id, &account_infos, &instruction.data)
    }
/*
    #[test]
    fn test_initialize_mint_account() {
        let program_id = Pubkey::new_unique();
        let mut rent_sysvar = rent_sysvar();

        // account is not rent exempt
        assert_eq!(
            Err(TokenError::NotRentExempt.into()),
            do_process_instruction(
                initialize_account(&program_id, &account_key, &mint_key, &owner_key).unwrap(),
                vec![
                    &mut account_account,
                    &mut mint_account,
                    &mut owner_account,
                    &mut rent_sysvar
                ],
            )
        );
    }*/
}