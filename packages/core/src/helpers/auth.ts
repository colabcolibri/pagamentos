/**
 * Helpers de autenticação
 */

export type AccessCodeRequest = {
  email: string
  name: string
  redirectUrl: string
  phone?: string
  document?: string
}

export type AccessCodeResult = {
  userExists: boolean
  emailSent: boolean
  message: string
  error?: Error
}

export type AccessCodeGateway = {
  request(input: AccessCodeRequest): Promise<AccessCodeResult>
}

/**
 * Pede um código de acesso pelo gateway da aplicação.
 * Não chama listUsers, createUser nem signInWithOtp.
 */
export async function sendOtpAndCreateUserIfNeeded(
  gateway: AccessCodeGateway,
  email: string,
  name: string,
  redirectUrl: string,
  phone?: string,
  document?: string
): Promise<AccessCodeResult> {
  try {
    return await gateway.request({ email, name, redirectUrl, phone, document })
  } catch (err) {
    console.error('Erro ao pedir código de acesso')
    return {
      userExists: false,
      emailSent: false,
      message: 'Erro ao processar solicitação',
      error: err instanceof Error ? err : new Error('Erro desconhecido'),
    }
  }
}

/**
 * Cria ou atualiza profile no schema payments
 */
export async function upsertUserProfile(
  supabase: any,
  userId: string,
  data: {
    email: string;
    name: string;
    phone?: string;
    document?: string;
  }
): Promise<{ profile: any; error?: Error }> {
  try {
    const { data: profile, error: profileError } = await supabase
      .schema('payments')
      .rpc('upsert_profile', {
        user_id: userId,
        user_email: data.email,
        user_name: data.name,
        user_phone: data.phone || null,
        user_document: data.document || null,
        user_person_type: data.document && data.document.length > 14 ? 'company' : 'individual',
      });

    if (profileError) {
      return {
        profile: null,
        error: new Error('Erro ao processar dados do cliente'),
      };
    }

    return { profile };
  } catch (err) {
    return {
      profile: null,
      error: err instanceof Error ? err : new Error('Erro desconhecido'),
    };
  }
}

