alter table public.ai_operation_logs
drop constraint if exists ai_operation_logs_operation_type_check;

alter table public.ai_operation_logs
add constraint ai_operation_logs_operation_type_check
check (
operation_type in (
'change_shift_staff',
'update_shift_time',
'batch_mutation'
)
);
