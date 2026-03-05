export async function shareBookAchievement(params: {
  bookName: string;
  streak: number;
  category: string;
}) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d')!;

  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, 0, 1920);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(1, '#1e3a1e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1080, 1920);

  // Decorative particles
  ctx.fillStyle = 'rgba(132, 204, 22, 0.08)';
  for (let i = 0; i < 18; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * 1080, Math.random() * 1920, 40 + Math.random() * 120, 0, Math.PI * 2);
    ctx.fill();
  }

  // Central emoji
  ctx.font = '180px serif';
  ctx.textAlign = 'center';
  ctx.fillText('📖', 540, 780);

  // Book name
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 96px Inter, sans-serif';
  ctx.fillText(params.bookName, 540, 950);

  // Category
  ctx.fillStyle = '#84cc16';
  ctx.font = '48px Inter, sans-serif';
  ctx.fillText(params.category, 540, 1030);

  // Streak
  ctx.fillStyle = '#f8fafc';
  ctx.font = '42px Inter, sans-serif';
  ctx.fillText(`🔥 ${params.streak} dias de sequência`, 540, 1150);

  // Watermark
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '36px Inter, sans-serif';
  ctx.fillText('Jornada Bíblica', 540, 1820);

  canvas.toBlob(async (blob) => {
    if (!blob) return;
    const file = new File([blob], 'conquista.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: `Concluí o livro de ${params.bookName}!` });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'conquista.png';
      a.click();
      URL.revokeObjectURL(url);
    }
  }, 'image/png');
}
