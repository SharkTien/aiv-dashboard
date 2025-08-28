"use client";
import { useEffect, useState } from "react";

type UniMapping = {
  uni_id: number;
  entity_id: number;
  uni_name: string;
  created_at: string;
  entity_name?: string;
};

type Entity = {
  entity_id: number;
  name: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export default function UniMappingManager() {
  const [items, setItems] = useState<UniMapping[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  async function loadEntities() {
    try {
      const res = await fetch("/api/entities");
      
      if (res.status === 401) {
        console.error("Unauthorized - user not logged in");
        setEntities([]);
        return;
      }
      
      const data = await res.json();
      if (data.error) {
        console.error("API Error:", data.error);
        setEntities([]);
      } else {
        const entitiesArray = Array.isArray(data.items) ? data.items : [];
        setEntities(entitiesArray);
      }
    } catch (error) {
      console.error("Error loading entities:", error);
      setEntities([]);
    }
  }

  async function load(page: number = 1) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20"
      });
      
      if (searchTerm.trim()) {
        params.append("q", searchTerm.trim());
      }
      
      if (selectedEntity) {
        params.append("entity_id", selectedEntity);
      }

      const res = await fetch(`/api/uni-mapping?${params}`);
      const data = await res.json();
      
      setItems(Array.isArray(data.items) ? data.items : []);
      setPagination(data.pagination || null);
    } catch (error) {
      console.error("Error loading uni mappings:", error);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadEntities();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    load(1);
  }, [searchTerm, selectedEntity]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    load(page);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl p-6 border border-gray-200/50 dark:border-gray-600/50">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search universities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all"
            />
          </div>
          <div className="w-64">
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="w-full h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all"
            >
              <option value="">All Entities</option>
              {Array.isArray(entities) && entities.length > 0 ? (
                entities.map((entity) => (
                  <option key={entity.entity_id} value={entity.entity_id}>
                    {entity.name}
                  </option>
                ))
              ) : (
                <option value="" disabled>Loading entities...</option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white/60 dark:bg-gray-700/60 rounded-xl p-6 border border-gray-200/50 dark:border-gray-600/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            University Mappings
          </h3>
          {pagination && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
            </div>
          )}
        </div>
        
        {loading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No university mappings found
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.uni_id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/60 dark:bg-gray-700/60 border border-gray-200/50 dark:border-gray-600/50 hover:bg-white/80 dark:hover:bg-gray-700/80 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {item.uni_name}
                    </div>
                                         <div className="text-sm text-gray-600 dark:text-gray-300">
                       Entity: {item.entity_name || `ID: ${item.entity_id}`}
                     </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Created: {new Date(item.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                    ID: {item.uni_id}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200/50 dark:border-gray-600/50">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.hasPrev}
                    className="px-3 py-2 text-sm rounded-lg ring-1 ring-black/15 dark:ring-white/15 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.hasNext}
                    className="px-3 py-2 text-sm rounded-lg ring-1 ring-black/15 dark:ring-white/15 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
