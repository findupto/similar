import './salesAudit.js';

const TAB_ID = 'sales-audit-sidebar-tab';

function installSalesAuditTab() {
  const nav = document.querySelector('.sidebar nav');
  const auditButton = document.getElementById('mk-audit-open');
  if (!nav || !auditButton) return;

  auditButton.style.display = 'none';

  let tab = document.getElementById(TAB_ID);
  if (!tab) {
    tab = document.createElement('button');
    tab.id = TAB_ID;
    tab.type = 'button';
    tab.innerHTML = '<span class="sales-audit-icon">▣</span><span>Sales Audit</span>';
    tab.title = 'Sales Audit';
    tab.addEventListener('click', () => auditButton.click());
  }

  if (!nav.contains(tab)) nav.appendChild(tab);
}

function start() {
  installSalesAuditTab();
  const observer = new MutationObserver(installSalesAuditTab);
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
