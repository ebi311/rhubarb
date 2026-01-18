export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	graphql_public: {
		Tables: {
			[_ in never]: never;
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			graphql: {
				Args: {
					extensions?: Json;
					operationName?: string;
					query?: string;
					variables?: Json;
				};
				Returns: Json;
			};
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
	public: {
		Tables: {
			basic_schedule_staff_assignments: {
				Row: {
					basic_schedule_id: string;
					created_at: string;
					id: string;
					staff_id: string;
					updated_at: string;
				};
				Insert: {
					basic_schedule_id: string;
					created_at?: string;
					id?: string;
					staff_id: string;
					updated_at?: string;
				};
				Update: {
					basic_schedule_id?: string;
					created_at?: string;
					id?: string;
					staff_id?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'basic_schedule_staff_assignments_basic_schedule_id_fkey';
						columns: ['basic_schedule_id'];
						isOneToOne: false;
						referencedRelation: 'basic_schedules';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'basic_schedule_staff_assignments_staff_id_fkey';
						columns: ['staff_id'];
						isOneToOne: false;
						referencedRelation: 'staffs';
						referencedColumns: ['id'];
					},
				];
			};
			basic_schedules: {
				Row: {
					client_id: string;
					created_at: string;
					day_of_week: Database['public']['Enums']['day_of_week'];
					deleted_at: string | null;
					end_time: string;
					id: string;
					note: string | null;
					service_type_id: string;
					start_time: string;
					updated_at: string;
				};
				Insert: {
					client_id: string;
					created_at?: string;
					day_of_week: Database['public']['Enums']['day_of_week'];
					deleted_at?: string | null;
					end_time: string;
					id?: string;
					note?: string | null;
					service_type_id: string;
					start_time: string;
					updated_at?: string;
				};
				Update: {
					client_id?: string;
					created_at?: string;
					day_of_week?: Database['public']['Enums']['day_of_week'];
					deleted_at?: string | null;
					end_time?: string;
					id?: string;
					note?: string | null;
					service_type_id?: string;
					start_time?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'basic_schedules_client_id_fkey';
						columns: ['client_id'];
						isOneToOne: false;
						referencedRelation: 'clients';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'basic_schedules_service_type_id_fkey';
						columns: ['service_type_id'];
						isOneToOne: false;
						referencedRelation: 'service_types';
						referencedColumns: ['id'];
					},
				];
			};
			client_staff_assignments: {
				Row: {
					client_id: string;
					created_at: string;
					id: string;
					note: string | null;
					service_type_id: string;
					staff_id: string;
					updated_at: string;
				};
				Insert: {
					client_id: string;
					created_at?: string;
					id?: string;
					note?: string | null;
					service_type_id: string;
					staff_id: string;
					updated_at?: string;
				};
				Update: {
					client_id?: string;
					created_at?: string;
					id?: string;
					note?: string | null;
					service_type_id?: string;
					staff_id?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'client_staff_assignments_client_id_fkey';
						columns: ['client_id'];
						isOneToOne: false;
						referencedRelation: 'clients';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'client_staff_assignments_service_type_id_fkey';
						columns: ['service_type_id'];
						isOneToOne: false;
						referencedRelation: 'service_types';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'client_staff_assignments_staff_id_fkey';
						columns: ['staff_id'];
						isOneToOne: false;
						referencedRelation: 'staffs';
						referencedColumns: ['id'];
					},
				];
			};
			clients: {
				Row: {
					address: string;
					contract_status: Database['public']['Enums']['contract_status'];
					created_at: string;
					id: string;
					name: string;
					office_id: string;
					updated_at: string;
				};
				Insert: {
					address: string;
					contract_status?: Database['public']['Enums']['contract_status'];
					created_at?: string;
					id?: string;
					name: string;
					office_id: string;
					updated_at?: string;
				};
				Update: {
					address?: string;
					contract_status?: Database['public']['Enums']['contract_status'];
					created_at?: string;
					id?: string;
					name?: string;
					office_id?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'clients_office_id_fkey';
						columns: ['office_id'];
						isOneToOne: false;
						referencedRelation: 'offices';
						referencedColumns: ['id'];
					},
				];
			};
			offices: {
				Row: {
					created_at: string;
					id: string;
					name: string;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					id?: string;
					name: string;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					name?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			service_types: {
				Row: {
					created_at: string;
					display_order: number;
					id: string;
					name: string;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					display_order?: number;
					id: string;
					name: string;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					display_order?: number;
					id?: string;
					name?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			shifts: {
				Row: {
					client_id: string;
					created_at: string;
					end_time: string;
					id: string;
					is_unassigned: boolean;
					service_type_id: string;
					staff_id: string | null;
					start_time: string;
					status: Database['public']['Enums']['shift_status'];
					updated_at: string;
				};
				Insert: {
					client_id: string;
					created_at?: string;
					end_time: string;
					id?: string;
					is_unassigned?: boolean;
					service_type_id: string;
					staff_id?: string | null;
					start_time: string;
					status?: Database['public']['Enums']['shift_status'];
					updated_at?: string;
				};
				Update: {
					client_id?: string;
					created_at?: string;
					end_time?: string;
					id?: string;
					is_unassigned?: boolean;
					service_type_id?: string;
					staff_id?: string | null;
					start_time?: string;
					status?: Database['public']['Enums']['shift_status'];
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'shifts_client_id_fkey';
						columns: ['client_id'];
						isOneToOne: false;
						referencedRelation: 'clients';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'shifts_service_type_id_fkey';
						columns: ['service_type_id'];
						isOneToOne: false;
						referencedRelation: 'service_types';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'shifts_staff_id_fkey';
						columns: ['staff_id'];
						isOneToOne: false;
						referencedRelation: 'staffs';
						referencedColumns: ['id'];
					},
				];
			};
			staff_availabilities: {
				Row: {
					created_at: string;
					day_of_week: Database['public']['Enums']['day_of_week'];
					end_time: string;
					id: string;
					priority: Database['public']['Enums']['availability_priority'];
					staff_id: string;
					start_time: string;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					day_of_week: Database['public']['Enums']['day_of_week'];
					end_time: string;
					id?: string;
					priority?: Database['public']['Enums']['availability_priority'];
					staff_id: string;
					start_time: string;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					day_of_week?: Database['public']['Enums']['day_of_week'];
					end_time?: string;
					id?: string;
					priority?: Database['public']['Enums']['availability_priority'];
					staff_id?: string;
					start_time?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'staff_availabilities_staff_id_fkey';
						columns: ['staff_id'];
						isOneToOne: false;
						referencedRelation: 'staffs';
						referencedColumns: ['id'];
					},
				];
			};
			staff_service_type_abilities: {
				Row: {
					created_at: string;
					id: string;
					service_type_id: string;
					staff_id: string;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					id?: string;
					service_type_id: string;
					staff_id: string;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					service_type_id?: string;
					staff_id?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'staff_service_type_abilities_service_type_id_fkey';
						columns: ['service_type_id'];
						isOneToOne: false;
						referencedRelation: 'service_types';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'staff_service_type_abilities_staff_id_fkey';
						columns: ['staff_id'];
						isOneToOne: false;
						referencedRelation: 'staffs';
						referencedColumns: ['id'];
					},
				];
			};
			staffs: {
				Row: {
					auth_user_id: string | null;
					created_at: string;
					email: string | null;
					id: string;
					name: string;
					note: string | null;
					office_id: string;
					role: Database['public']['Enums']['user_role'];
					updated_at: string;
				};
				Insert: {
					auth_user_id?: string | null;
					created_at?: string;
					email?: string | null;
					id?: string;
					name: string;
					note?: string | null;
					office_id: string;
					role?: Database['public']['Enums']['user_role'];
					updated_at?: string;
				};
				Update: {
					auth_user_id?: string | null;
					created_at?: string;
					email?: string | null;
					id?: string;
					name?: string;
					note?: string | null;
					office_id?: string;
					role?: Database['public']['Enums']['user_role'];
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'staffs_office_id_fkey';
						columns: ['office_id'];
						isOneToOne: false;
						referencedRelation: 'offices';
						referencedColumns: ['id'];
					},
				];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			is_admin_in_office: {
				Args: { target_office_id: string };
				Returns: boolean;
			};
		};
		Enums: {
			availability_priority: 'High' | 'Low';
			contract_status: 'active' | 'suspended';
			day_of_week: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
			shift_status: 'scheduled' | 'confirmed' | 'completed' | 'canceled';
			user_role: 'admin' | 'helper';
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		| keyof DefaultSchema['Enums']
		| { schema: keyof DatabaseWithoutInternals },
	EnumName extends DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
		: never = never,
> = DefaultSchemaEnumNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
		? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof DefaultSchema['CompositeTypes']
		| { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
		: never = never,
> = PublicCompositeTypeNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
		? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
		: never;

export const Constants = {
	graphql_public: {
		Enums: {},
	},
	public: {
		Enums: {
			availability_priority: ['High', 'Low'],
			contract_status: ['active', 'suspended'],
			day_of_week: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
			shift_status: ['scheduled', 'confirmed', 'completed', 'canceled'],
			user_role: ['admin', 'helper'],
		},
	},
} as const;
