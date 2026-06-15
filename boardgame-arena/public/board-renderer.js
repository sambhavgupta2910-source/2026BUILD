// Generic canvas board renderer shared by all games. Consumes the layout
// descriptor returned by a game module's getBoardLayout(state) plus optional
// per-game renderHooks for custom cell/token/overlay drawing.

export const COLOR_MAP = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
};

function defaultCellFill(cell) {
  if (cell.kind === 'square') {
    return (cell.col + cell.row) % 2 === 0 ? '#f8fafc' : '#e2e8f0';
  }
  if (cell.color && COLOR_MAP[cell.color]) {
    return hexWithAlpha(COLOR_MAP[cell.color], 0.25);
  }
  if (cell.kind === 'center') return '#fde68a';
  if (cell.kind === 'yard') return '#f1f5f9';
  return '#f8fafc';
}

function hexWithAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export class BoardRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  // Resize the canvas backing store to match its CSS size (which is controlled
  // by the page layout / aspect-ratio CSS) while accounting for devicePixelRatio.
  resizeToContainer(cols, rows) {
    const canvas = this.canvas;
    const cssWidth = canvas.clientWidth || 320;
    const cssHeight = canvas.clientHeight || Math.round((cssWidth * rows) / cols);
    const dpr = window.devicePixelRatio || 1;

    const targetWidth = Math.round(cssWidth * dpr);
    const targetHeight = Math.round(cssHeight * dpr);
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width: cssWidth, height: cssHeight };
  }

  render(game, state) {
    const layout = game.getBoardLayout(state);
    const { width, height } = this.resizeToContainer(layout.cols, layout.rows);
    const ctx = this.ctx;
    const hooks = game.renderHooks || {};

    ctx.clearRect(0, 0, width, height);

    const boardRect = { x: 0, y: 0, w: width, h: height };
    const cellW = width / layout.cols;
    const cellH = height / layout.rows;

    const cellRectOf = (cell) => ({
      x: cell.col * cellW,
      y: cell.row * cellH,
      w: (cell.w || 1) * cellW,
      h: (cell.h || 1) * cellH,
    });

    // 1. Cells: default background/border, then per-game drawCell on top.
    for (const cell of layout.cells) {
      const rect = cellRectOf(cell);

      ctx.fillStyle = defaultCellFill(cell);
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);

      if (hooks.drawCell) {
        hooks.drawCell(ctx, cell, rect, state);
      }
    }

    // 2. Tokens: group by cell so multiple tokens on one square fan out.
    const cellById = new Map(layout.cells.map((c) => [c.id, c]));
    const tokensByCell = new Map();
    for (const token of layout.tokens) {
      const list = tokensByCell.get(token.cellId) || [];
      list.push(token);
      tokensByCell.set(token.cellId, list);
    }

    for (const [cellId, tokens] of tokensByCell) {
      const cell = cellById.get(cellId);
      if (!cell) continue;
      const rect = cellRectOf(cell);
      const gridSize = Math.max(1, Math.ceil(Math.sqrt(tokens.length)));
      const slotW = rect.w / gridSize;
      const slotH = rect.h / gridSize;
      const radius = Math.min(slotW, slotH) * 0.32;

      tokens.forEach((token, i) => {
        const row = Math.floor(i / gridSize);
        const col = i % gridSize;
        const cx = rect.x + col * slotW + slotW / 2;
        const cy = rect.y + row * slotH + slotH / 2;
        const tokenRect = { x: cx - radius, y: cy - radius, w: radius * 2, h: radius * 2 };

        if (hooks.drawToken && hooks.drawToken(ctx, token, tokenRect, state) === true) {
          return;
        }

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = COLOR_MAP[token.color] || '#999';
        ctx.fill();
        ctx.lineWidth = Math.max(1, radius * 0.15);
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        if (hooks.drawToken) {
          hooks.drawToken(ctx, token, tokenRect, state);
        }
      });
    }

    // 3. Overlay: decorations like snake/ladder lines, drawn last.
    if (hooks.drawOverlay) {
      hooks.drawOverlay(ctx, layout, state, boardRect);
    }
  }
}
