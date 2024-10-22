import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "../types/.database.types";
import dotenv from "dotenv"

dotenv.config();

const supabaseBrowserClient = createClientComponentClient<Database>({
  options: {
    realtime: {
      params: {
        eventsPerSecond: -1,
      },
    },
  },
});

export { supabaseBrowserClient };