/**
 * Reduz uma imagem enviada pelo usuário a uma miniatura quadrada em JPEG.
 *
 * As imagens ficam embutidas no próprio documento do Firestore (o mesmo padrão
 * do logo do clube), que tem limite de 1MB. Uma foto de celular passa disso
 * fácil; reduzida a 320px ela fica em torno de 15–30KB e carrega rápido no PDV.
 */
export const gerarMiniatura = (arquivo: File, lado = 320, qualidade = 0.78): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!arquivo.type.startsWith('image/')) {
      reject(new Error('O arquivo escolhido não é uma imagem.'));
      return;
    }
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      // Recorte central quadrado: produto fica centralizado e sem distorção.
      const menor = Math.min(img.width, img.height);
      const sx = (img.width - menor) / 2;
      const sy = (img.height - menor) / 2;
      const canvas = document.createElement('canvas');
      canvas.width = lado;
      canvas.height = lado;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Não foi possível processar a imagem.'));
        return;
      }
      // Fundo branco: PNG transparente vira JPEG sem fundo preto.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, lado, lado);
      ctx.drawImage(img, sx, sy, menor, menor, 0, 0, lado, lado);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', qualidade));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler a imagem.'));
    };
    img.src = url;
  });
