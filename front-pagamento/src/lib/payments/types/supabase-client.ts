export type AppSupabaseClient = {
  schema: (name: string) => any
  from: (table: string) => any
}
