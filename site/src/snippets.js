// The code on neoplasticism.dev. Each snippet is a list of frames; the page animates
// between frames as you scroll. scripts/prepare.mjs tokenizes every frame with the real
// built VS Code theme, so the colors on the page are the theme's, not hand-picked.
//
// Lines keep their identity across frames by content, so a line that appears in two
// frames (even in a different place) slides instead of being redrawn.

export const snippets = {
  colors: {
    lang: "ts",
    frames: [
      `const prices: number[] = [12, 40, 7];
const total = sum(prices) * 1.0625;
console.log(\`Total: \${total}\`);`,
    ],
  },

  levels: {
    lang: "ts",
    frames: [
      `async function syncInvoices(id: string) {
  const account = await loadAccount(id);
  const invoices = await fetchInvoices(account);
  const report = reconcile(invoices, account.ledger);
  return report;
}`,
      `async function syncInvoices(id: string) {
  const account = await loadAccount(id);
  const invoices = await fetchInvoices(account);
  const report = reconcile(invoices, account.ledger);
  for (const inv of report.overdue) {
    const days = (Date.now() - inv.sentAt) / 86_400_000;
    if (days > 30 && inv.amountDue > 500) {
      inv.status = "escalated";
    } else if (days > 7) {
      inv.status = "reminded";
    }
  }
  return report;
}`,
      `async function syncInvoices(id: string) {
  const account = await loadAccount(id);
  const invoices = await fetchInvoices(account);
  const report = reconcile(invoices, account.ledger);
  flagOverdue(report.overdue);
  return report;
}

function flagOverdue(invoices: Invoice[]) {
  for (const inv of invoices) {
    const days = (Date.now() - inv.sentAt) / 86_400_000;
    if (days > 30 && inv.amountDue > 500) {
      inv.status = "escalated";
    } else if (days > 7) {
      inv.status = "reminded";
    }
  }
}`,
    ],
  },

  lazy: {
    lang: "lua",
    frames: [
      `-- Neovim, with lazy.nvim
{ "brysontang/neoplasticism", lazy = false, priority = 1000 }
vim.cmd.colorscheme("neoplasticism")`,
    ],
  },

  everything: {
    lang: "sh",
    frames: [
      `# Everything at once: VS Code, Neovim, Ghostty, tmux, git
git clone https://github.com/brysontang/neoplasticism
cd neoplasticism && ./install.sh`,
    ],
  },
};
