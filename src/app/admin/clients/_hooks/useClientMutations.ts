import {
	createServiceUserAction,
	resumeServiceUserAction,
	suspendServiceUserAction,
	updateServiceUserAction,
} from '@/app/actions/serviceUsers';
import type { ActionResult } from '@/app/actions/utils/actionResult';
import type { ContractStatus, ServiceUserInput } from '@/models/serviceUser';
import { useRouter } from 'next/navigation';

const handleError = (error: string, context: string) => {
	console.error(`${context}:`, error);
	// TODO: エラートースト表示
};

const executeAction = async <T>(
	action: () => Promise<ActionResult<T>>,
	onSuccess: () => void,
	errorContext: string,
) => {
	try {
		const result = await action();
		if (result.error) {
			handleError(result.error, errorContext);
			return false;
		}
		onSuccess();
		return true;
	} catch (error) {
		handleError(error instanceof Error ? error.message : 'Unknown error', errorContext);
		return false;
	}
};

export const useClientMutations = (onSuccess: () => void) => {
	const router = useRouter();

	const handleSuccess = () => {
		onSuccess();
		router.refresh();
	};

	const createClient = async (data: ServiceUserInput) => {
		return executeAction(
			() => createServiceUserAction(data),
			handleSuccess,
			'Failed to create service user',
		);
	};

	const updateClient = async (id: string, data: ServiceUserInput) => {
		return executeAction(
			() => updateServiceUserAction(id, data),
			handleSuccess,
			'Failed to update service user',
		);
	};

	const updateContractStatus = async (
		id: string,
		currentStatus: ContractStatus,
		newStatus: ContractStatus,
	) => {
		if (currentStatus === newStatus) return true;

		const action =
			newStatus === 'suspended'
				? () => suspendServiceUserAction(id)
				: () => resumeServiceUserAction(id);

		return executeAction(action, handleSuccess, 'Failed to update contract status');
	};

	return { createClient, updateClient, updateContractStatus };
};
