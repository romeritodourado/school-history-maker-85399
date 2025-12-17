// Função para ordenar recursivamente as chaves de um objeto para garantir serialização JSON consistente
function sortObjectKeys(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }

  const sortedKeys = Object.keys(obj).sort();
  const sortedObject: any = {};

  for (const key of sortedKeys) {
    sortedObject[key] = sortObjectKeys(obj[key]);
  }

  return sortedObject;
}

// Função para gerar o hash SHA-256 do conteúdo do histórico
export async function generateTranscriptHash(data: any): Promise<string> {
  // 1. Ordenar as chaves do objeto recursivamente para garantir que JSON.stringify seja consistente
  const sortedData = sortObjectKeys(data);
  
  // 2. Serializar o objeto ordenado
  const dataString = JSON.stringify(sortedData);
  
  const textEncoder = new TextEncoder();
  const dataBuffer = textEncoder.encode(dataString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}