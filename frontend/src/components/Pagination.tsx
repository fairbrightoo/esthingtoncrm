import React from 'react';

interface PaginationProps {
    dataLength: number;
    currentPage: number;
    rowsPerPage: number;
    setPage: (page: number) => void;
    setRowsPerPage?: (rows: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ dataLength, currentPage, rowsPerPage, setPage, setRowsPerPage }) => {
    const totalPages = Math.ceil(dataLength / rowsPerPage);
    if (dataLength === 0) return null;

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50/30 gap-3">
            <div className="flex items-center gap-4">
                <span className="text-xs text-gray-500">
                    Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, dataLength)} of {dataLength} entries
                </span>
                
                {setRowsPerPage && (
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Rows per page:</span>
                        <select 
                            value={rowsPerPage}
                            onChange={(e) => {
                                setRowsPerPage(Number(e.target.value));
                                setPage(1); // Reset to page 1 on resize
                            }}
                            className="px-2 py-1 text-xs border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-1 self-end sm:self-auto">
                <button 
                    disabled={currentPage === 1}
                    onClick={() => setPage(currentPage - 1)}
                    className="px-3 py-1 border border-gray-200 rounded text-xs font-medium text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                >
                    Prev
                </button>
                <span className="text-xs font-bold px-3 py-1 bg-white border border-gray-200 rounded text-gray-700 shadow-sm">
                    {currentPage} / {totalPages || 1}
                </span>
                <button 
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => setPage(currentPage + 1)}
                    className="px-3 py-1 border border-gray-200 rounded text-xs font-medium text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export function getPaginatedData<T>(data: T[], page: number, rows: number): T[] {
    const start = (page - 1) * rows;
    return data.slice(start, start + rows);
}
