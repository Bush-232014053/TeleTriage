document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  const statusFilter = document.getElementById('statusFilter');
  const tableRows = document.querySelectorAll('#queueTableBody tr');

  // Dynamic Search & Status Filter Functionality
  function filterQueue() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const selectedStatus = statusFilter.value.toLowerCase();

    tableRows.forEach(row => {
      const rowText = row.textContent.toLowerCase();
      const statusBadge = row.querySelector('.badge[class*="status-"]');
      const rowStatus = statusBadge ? statusBadge.textContent.toLowerCase() : '';

      const matchesSearch = rowText.includes(searchTerm);
      const matchesStatus = (selectedStatus === 'all') || (rowStatus === selectedStatus);

      if (matchesSearch && matchesStatus) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  }

  // Event Listeners for Real-time filtering
  searchInput.addEventListener('input', filterQueue);
  statusFilter.addEventListener('change', filterQueue);
});