import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "./pagination";

function getVisiblePages(currentPage, totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = [];

  // Always show first page
  pages.push(1);

  let start = Math.max(2, currentPage - 1);
  let end = Math.min(totalPages - 1, currentPage + 1);

  // Adjust range
  if (currentPage <= 3) {
    start = 2;
    end = Math.min(4, totalPages - 1);
  }
  if (currentPage >= totalPages - 2) {
    start = Math.max(totalPages - 3, 2);
    end = totalPages - 1;
  }

  if (start > 2) {
    pages.push("ellipsis-start");
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (end < totalPages - 1) {
    pages.push("ellipsis-end");
  }

  // Always show last page
  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}

export default function PaginationBar({
  currentPage,
  totalPages,
  totalCount,
  onPageChange,
  pageSize = 10,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20],
}) {
  if (totalPages <= 1 && totalCount <= 0) return null;

  const pages = getVisiblePages(currentPage, totalPages);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6">
      <div className="flex items-center gap-3">
        <p className="text-xs text-muted-foreground">
          {totalCount > 0
            ? `Hiển thị ${(currentPage - 1) * pageSize + 1}–${Math.min(
                currentPage * pageSize,
                totalCount,
              )} trong ${totalCount}`
            : "Không có dữ liệu"}
        </p>

        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
            }}
            className="text-xs border border-border rounded-lg px-2 py-1 bg-card text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} / trang
              </option>
            ))}
          </select>
        )}
      </div>

      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={(e) => {
                e.preventDefault();
                if (currentPage > 1) onPageChange(currentPage - 1);
              }}
              className={
                currentPage <= 1
                  ? "pointer-events-none opacity-40"
                  : "cursor-pointer"
              }
            />
          </PaginationItem>

          {pages.map((p, i) => {
            if (typeof p === "string") {
              return (
                <PaginationItem key={p}>
                  <PaginationEllipsis />
                </PaginationItem>
              );
            }
            return (
              <PaginationItem key={p}>
                <PaginationLink
                  isActive={p === currentPage}
                  onClick={(e) => {
                    e.preventDefault();
                    if (p !== currentPage) onPageChange(p);
                  }}
                  className="cursor-pointer"
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            );
          })}

          <PaginationItem>
            <PaginationNext
              onClick={(e) => {
                e.preventDefault();
                if (currentPage < totalPages) onPageChange(currentPage + 1);
              }}
              className={
                currentPage >= totalPages
                  ? "pointer-events-none opacity-40"
                  : "cursor-pointer"
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
