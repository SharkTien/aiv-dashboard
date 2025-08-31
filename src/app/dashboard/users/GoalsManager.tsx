"use client";
import { useEffect, useState } from "react";

type Entity = { entity_id: number; name: string; type: string };
type Form = { id: number; code: string; name: string; type: string };
type Goal = {
  id: number;
  entity_id: number;
  form_id: number;
  goal_value: number;
  entity_name: string;
  entity_type: string;
  form_name: string;
  form_code: string;
  form_type: string;
  created_at: string;
  updated_at: string;
};

type EntityGoal = {
  entity_id: number;
  entity_name: string;
  entity_type: string;
  goal_value: string;
  existing_goal_id?: number;
};

export default function GoalsManager() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [entityGoals, setEntityGoals] = useState<EntityGoal[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  // Update entity goals when form is selected
  useEffect(() => {
    if (selectedForm && entities.length > 0) {
      // Show all entities (including national and organic) for goal setting
      const allEntities = entities;
      const goalsForForm = allEntities.map(entity => {
        const existingGoal = goals.find(g => g.entity_id === entity.entity_id && g.form_id === selectedForm.id);
        return {
          entity_id: entity.entity_id,
          entity_name: entity.name,
          entity_type: entity.type,
          goal_value: existingGoal ? existingGoal.goal_value.toString() : "",
          existing_goal_id: existingGoal?.id
        };
      });
      setEntityGoals(goalsForForm);
    }
  }, [selectedForm, entities, goals]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load entities
      const entitiesRes = await fetch("/api/entities");
      const entitiesData = await entitiesRes.json();
      if (entitiesData.success) {
        setEntities(entitiesData.items || []);
      }

      // Load forms
      const formsRes = await fetch("/api/forms");
      const formsData = await formsRes.json();
      if (formsData.success) {
        setForms(formsData.items || []);
      }

      // Load goals
      const goalsRes = await fetch("/api/goals");
      const goalsData = await goalsRes.json();
      if (goalsData.success) {
        setGoals(goalsData.items || []);
      }
    } catch (err) {
      setError("Failed to load data");
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoalChange = (entityId: number, value: string) => {
    // Only allow positive integers (including 0)
    // Remove any non-digit characters except for the first character if it's a valid number
    const cleanValue = value.replace(/[^0-9]/g, '');
    
    // Prevent leading zeros (except for single 0)
    const finalValue = cleanValue === '0' ? '0' : cleanValue.replace(/^0+/, '') || '';
    
    setEntityGoals(prev => 
      prev.map(eg => 
        eg.entity_id === entityId 
          ? { ...eg, goal_value: finalValue }
          : eg
      )
    );
  };

  const handleSaveAllGoals = async () => {
    if (!selectedForm) {
      alert("Please select a form first");
      return;
    }

         const goalsToSave = entityGoals.filter(eg => eg.goal_value.trim() !== "");
    
    if (goalsToSave.length === 0) {
      alert("Please enter at least one goal value");
      return;
    }

         setSaving(true);
     try {
       // Process each goal
       for (const entityGoal of goalsToSave) {
                 const goalValue = parseInt(entityGoal.goal_value);
         if (isNaN(goalValue) || goalValue < 0) {
           alert(`Invalid goal value for ${entityGoal.entity_name}`);
           return;
         }

        if (entityGoal.existing_goal_id) {
          // Update existing goal
          const res = await fetch("/api/goals", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: entityGoal.existing_goal_id,
              entity_id: entityGoal.entity_id,
              form_id: selectedForm.id,
              goal_value: goalValue
            }),
          });
          if (!res.ok) {
            const data = await res.json();
            alert(`Failed to update goal for ${entityGoal.entity_name}: ${data.error}`);
            return;
          }
        } else {
          // Create new goal
          const res = await fetch("/api/goals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              entity_id: entityGoal.entity_id,
              form_id: selectedForm.id,
              goal_value: goalValue
            }),
          });
          if (!res.ok) {
            const data = await res.json();
            alert(`Failed to create goal for ${entityGoal.entity_name}: ${data.error}`);
            return;
          }
        }
      }

      loadData(); // Reload data to get updated goals
    } catch (err) {
      alert("Failed to save goals");
      console.error("Error saving goals:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGoal = async (id: number) => {
    if (!confirm("Are you sure you want to delete this goal?")) return;

    try {
      const res = await fetch(`/api/goals?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete goal");
      }
    } catch (err) {
      alert("Failed to delete goal");
    }
  };

  if (loading || saving) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/bg.png)' }}>
        <img src="/giphy.gif" alt="Loading..." className="h-50 w-50 object-contain" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Goals Management</h2>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Form Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Phase</h3>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Choose Phase
            </label>
            <select
              value={selectedForm?.id || ""}
              onChange={(e) => {
                const formId = e.target.value ? parseInt(e.target.value) : null;
                const form = forms.find(f => f.id === formId) || null;
                setSelectedForm(form);
              }}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select a form...</option>
              {forms.map((form) => (
                <option key={form.id} value={form.id}>
                  {form.name} ({form.code}) - {form.type}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Goals Input for Selected Form */}
      {selectedForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Set Goals for {selectedForm.name} ({selectedForm.code})
            </h3>
            <button
              onClick={handleSaveAllGoals}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save All Goals"}
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">Entity</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Goal Value</th>
                  <th className="px-6 py-3">Current Goal</th>
                </tr>
              </thead>
              <tbody>
                {entityGoals.map((entityGoal) => (
                  <tr key={entityGoal.entity_id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {entityGoal.entity_name}
                    </td>
                    <td className="px-6 py-4 text-gray-900 dark:text-white">
                      <span className={`px-2 py-1 text-xs rounded ${
                        entityGoal.entity_type === 'national' 
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                      }`}>
                        {entityGoal.entity_type}
                      </span>
                    </td>
                                         <td className="px-6 py-4">
                       <input
                         type="text"
                         value={entityGoal.goal_value}
                         onChange={(e) => handleGoalChange(entityGoal.entity_id, e.target.value)}
                         onKeyDown={(e) => {
                           // Prevent entering minus sign, comma, dot, and other non-digit characters
                           if (['-', ',', '.', 'e', 'E'].includes(e.key)) {
                             e.preventDefault();
                           }
                         }}
                         placeholder="Enter goal value"
                         className="w-32 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                       />
                     </td>
                                         <td className="px-6 py-4 text-gray-900 dark:text-white">
                       {entityGoal.existing_goal_id ? (
                         <span className="text-green-600 dark:text-green-400">✓ Set</span>
                       ) : (
                         <span className="text-gray-400">Not set</span>
                       )}
                     </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Current Goals Table */}
      {selectedForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Current Goals for {selectedForm.name} ({selectedForm.code})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">Entity</th>
                  <th className="px-6 py-3">Goal Value</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {goals
                  .filter(goal => goal.form_id === selectedForm.id)
                  .map((goal) => (
                    <tr key={goal.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {goal.entity_name}
                        <span className={`ml-2 px-2 py-1 text-xs rounded ${
                          goal.entity_type === 'national' 
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                        }`}>
                          {goal.entity_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">
                        {goal.goal_value.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">
                        {goal.form_type}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                {goals.filter(goal => goal.form_id === selectedForm.id).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      No goals set for this form yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
