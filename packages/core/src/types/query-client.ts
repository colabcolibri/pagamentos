export interface SupabaseClient<
  _Database = unknown,
  _SchemaNameOrClientOptions = unknown,
  _SchemaName = unknown,
> {
  schema(name: string): any
  from(table: string): any
}
