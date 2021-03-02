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
    native_token::sol_to_lamports,
    clock::UnixTimestamp,
};
use std::mem::size_of;

use crate::{
    error::StepError,
    instruction::StepInstruction,
    state::StepProgramState,
    state::Pool,
    state::Stream,
    state::MAX_SEED_SIZE_BYTES,
    state::UserAccount,
    state::PubkeyData
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
            StepInstruction::CreateStream { input_token_pubkey, output_token_pubkey, interval_days, amount } => {
                msg!("Instruction: Create Stream");
                Self::process_create_stream(accounts,
                                            program_id,
                                            input_token_pubkey,
                                            output_token_pubkey,
                                            interval_days,
                                            amount)
            }
            StepInstruction::Execute { pda_seed } => {
                msg!("Instruction: Execute Trade");
                Self::process_trade(accounts, program_id, pda_seed)
            }
        }
    }

    //================================
    // Initialize Program
    //================================
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

    //================================
    // Initialize Pool
    //================================
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

        let token_account_seed = b"seedy"; // TODO: not hardcode this. each pool will have its own unique ID
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
            head_user: [0; size_of::<PubkeyData>()]
        }.pack_into_slice(&mut pool_account.data.borrow_mut());

        Ok(())
    }

    //================================
    // Deposit
    //================================
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
        let user_step_pool_account = next_account_info(account_info_iter)?;
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

        if pool_state.head_user == [0; size_of::<PubkeyData>()] {
            // First user depositing so setup the head of list
            pool_state.head_user = user_step_pool_account.key.to_bytes();
            Pool::pack(pool_state, &mut pool_info_account.data.borrow_mut())?;
        }

        let mut user_account = UserAccount::unpack_unchecked(&user_step_pool_account.data.borrow())?;
        user_account.balance += amount;
        UserAccount::pack(user_account, &mut user_step_pool_account.data.borrow_mut())?;

        Ok(())
    }

    //================================
    // Create Stream
    //================================
    fn process_create_stream(
        accounts: &[AccountInfo],
        _program_id: &Pubkey,
        input_token_pubkey: PubkeyData,
        output_token_pubkey: PubkeyData,
        interval_days: UnixTimestamp,
        amount: u64
    ) -> ProgramResult {

        let account_info_iter = &mut accounts.iter();
        let user = next_account_info(account_info_iter)?;

        if !user.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }

        let user_step_pool_account = next_account_info(account_info_iter)?;
        let step_pool_info_account = next_account_info(account_info_iter)?;
        let new_stream_account = next_account_info(account_info_iter)?;
        let last_user_stream = next_account_info(account_info_iter)?;

        let mut user_account = UserAccount::unpack_unchecked(&user_step_pool_account.data.borrow())?;

        // Check if user has any streams
        if user_account.head_stream == [0; size_of::<PubkeyData>()] {
            // User has no streams yet. Set the head to the new stream.
            user_account.head_stream = new_stream_account.key.to_bytes();
        }
        else {
            let mut last_stream = Stream::unpack_unchecked(&last_user_stream.data.borrow())?;
            last_stream.next_stream = new_stream_account.key.to_bytes();
        }

        Stream::new(input_token_pubkey,
                    output_token_pubkey,
                    [0; size_of::<PubkeyData>()],
                    interval_days,
                    amount).pack_into_slice(&mut new_stream_account.data.borrow_mut());

        Ok(())
    }

    //================================
    // Execute Trade
    //================================
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
        let swap_source_info = next_account_info(account_info_iter)?;
        let swap_destination_info = next_account_info(account_info_iter)?;
        let destination_info = next_account_info(account_info_iter)?;
        let pool_mint_info = next_account_info(account_info_iter)?;
        let pool_fee_account_info = next_account_info(account_info_iter)?;

        let host_fee_account: std::option::Option<&Pubkey> = None;

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
