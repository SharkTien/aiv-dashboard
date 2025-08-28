import FormsManager from "./FormsManager";

export default function FormsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Form Management</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Create and manage custom forms for data collection.
        </p>
      </div>
      <FormsManager />
    </div>
  );
}
