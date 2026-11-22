/**
 * Dados de contato exibidos ao público (aviso de privacidade, suporte).
 * PREENCHER antes de publicar: o e-mail que vai atender titulares de dados (LGPD)
 * e clientes. Enquanto vazio, as telas mostram "pelo suporte do Rank Manager".
 */
export const EMAIL_SUPORTE = '';

export const contatoSuporte = () => EMAIL_SUPORTE || 'o suporte do Rank Manager';
