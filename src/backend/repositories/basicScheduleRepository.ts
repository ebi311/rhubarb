import { SupabaseClient } from "@supabase/supabase-js";
import { BasicSchedule, BasicScheduleSchema } from "@/models/basicSchedule";
import { Database } from "@/backend/types/supabase";
import { formatTime } from "@/models/valueObjects/time";

type BasicScheduleRow = Database["public"]["Tables"]["basic_schedules"]["Row"];
type BasicScheduleInsert =
  Database["public"]["Tables"]["basic_schedules"]["Insert"];
type BasicScheduleUpdate =
  Database["public"]["Tables"]["basic_schedules"]["Update"];

export class BasicScheduleRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  private toDomain(row: BasicScheduleRow): BasicSchedule {
    return BasicScheduleSchema.parse({
      ...row,
      time: {
        start: row.start_time, // preprocessTime will handle the string "HHmm"
        end: row.end_time, // preprocessTime will handle the string "HHmm"
      },
    });
  }

  private toDB(entity: BasicSchedule): BasicScheduleInsert {
    return {
      id: entity.id,
      client_id: entity.client_id,
      service_type_id: entity.service_type_id,
      staff_id: entity.staff_id,
      day_of_week: entity.day_of_week,
      start_time: formatTime(entity.time.start),
      end_time: formatTime(entity.time.end),
      created_at: entity.created_at.toISOString(),
      updated_at: entity.updated_at.toISOString(),
    };
  }

  async findById(id: string): Promise<BasicSchedule | null> {
    const { data, error } = await this.supabase
      .from("basic_schedules")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) return null;

    return this.toDomain(data);
  }

  async create(schedule: BasicSchedule): Promise<void> {
    const dbData = this.toDB(schedule);
    const { error } = await this.supabase
      .from("basic_schedules")
      .insert(dbData);
    if (error) throw error;
  }
}
