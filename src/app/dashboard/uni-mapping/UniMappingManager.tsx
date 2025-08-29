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
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<UniMapping | null>(null);
  const [newUniName, setNewUniName] = useState("");
  const [newEntityId, setNewEntityId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadEntities() {
    try {
      const res = await fetch("/api/entities");
      
      if (res.status === 401) {
        console.error("Unauthorized - user not logged in");
        setEntities([]);
        return;
      }
      
      const data = await res.json();
      console.log("Entities API response:", data);
      if (data.error) {
        console.error("API Error:", data.error);
        setEntities([]);
      } else {
        const entitiesArray = Array.isArray(data.items) ? data.items : [];
        console.log("Entities array:", entitiesArray);
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

  async function handleAdd() {
    if (!newUniName.trim() || !newEntityId || newEntityId === "0") {
      alert("Please fill in all fields");
      return;
    }

    const entityIdNum = parseInt(newEntityId);
    if (isNaN(entityIdNum) || entityIdNum <= 0) {
      alert("Please select a valid entity");
      return;
    }

    const payload = {
      entity_id: entityIdNum,
      uni_name: newUniName.trim()
    };

    console.log("Sending payload:", payload);

    setSubmitting(true);
    try {
      const res = await fetch("/api/uni-mapping", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log("Response:", data);
      
      if (data.success) {
        setShowAddModal(false);
        setNewUniName("");
        setNewEntityId("");
        load(currentPage);
        alert("University mapping added successfully!");
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error adding uni mapping:", error);
      alert("Failed to add university mapping");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!selectedItem) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/uni-mapping?uni_id=${selectedItem.uni_id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      
      if (data.success) {
        setShowDeleteModal(false);
        setSelectedItem(null);
        load(currentPage);
        alert("University mapping deleted successfully!");
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error deleting uni mapping:", error);
      alert("Failed to delete university mapping");
    } finally {
      setSubmitting(false);
    }
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
          <button
            onClick={() => setShowAddModal(true)}
            className="h-11 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
          >
            Add New
          </button>
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
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                      ID: {item.uni_id}
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                      {selectedItem?.uni_id === item.uni_id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-10">
                          <button
                            onClick={() => setShowDeleteModal(true)}
                            className="w-full px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
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

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Add University Mapping
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  University Name
                </label>
                <input
                  type="text"
                  value={newUniName}
                  onChange={(e) => setNewUniName(e.target.value)}
                  className="w-full h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all"
                  placeholder="Enter university name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Entity
                </label>
                                 <select
                   value={newEntityId}
                   onChange={(e) => setNewEntityId(e.target.value)}
                   className="w-full h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-4 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all"
                 >
                   <option value="0">Select an entity</option>
                   {Array.isArray(entities) && entities.length > 0 ? (
                     entities.map((entity) => (
                       <option key={entity.entity_id} value={entity.entity_id}>
                         {entity.name}
                       </option>
                     ))
                   ) : (
                     <option value="0" disabled>Loading entities...</option>
                   )}
                 </select>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                disabled={submitting}
                className="flex-1 h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={submitting || !newUniName.trim() || !newEntityId || newEntityId === "0"}
                className="flex-1 h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Delete University Mapping
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete the university mapping for <strong>{selectedItem.uni_name}</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={submitting}
                className="flex-1 h-11 rounded-lg ring-1 ring-black/15 dark:ring-white/15 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={submitting}
                className="flex-1 h-11 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close modals */}
      {(showAddModal || showDeleteModal) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setShowAddModal(false);
            setShowDeleteModal(false);
            setSelectedItem(null);
          }}
        />
      )}
    </div>
  );
}
