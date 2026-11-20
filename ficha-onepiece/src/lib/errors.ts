/** Troca mensagens técnicas do Supabase por algo que o jogador entende. */
export function friendlyDbError(message: string): string {
  if (/does not exist|schema cache|could not find (the )?(function|table)|relation .* does not exist/i.test(message)) {
    return 'O banco ainda não tem a atualização de NPCs e Procurados. No Supabase, abra o SQL Editor e rode o arquivo supabase/02-npcs-e-procurados.sql.'
  }
  return message
}
