// Função para gerar o hash SHA-256 do conteúdo do histórico
export async function generateTranscriptHash(data: any): Promise<string> {
  // 1. Garantir que a serialização JSON seja consistente (ordenando chaves)
  // Embora JSON.stringify não garanta ordem, para objetos simples, a ordem é geralmente mantida.
  // Para máxima segurança, deveríamos usar uma biblioteca de serialização canônica,
  // mas para manter a simplicidade, vamos confiar no JSON.stringify padrão e garantir que o objeto 'data'
  // seja sempre estruturalmente idêntico.
  
  const dataString = JSON.stringify(data);
  
  const textEncoder = new TextEncoder();
  const dataBuffer = textEncoder.encode(dataString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}