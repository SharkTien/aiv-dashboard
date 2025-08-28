import UniMappingManager from "./UniMappingManager";

export default function UniMappingPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">University Mapping</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage university mappings and their relationships with entities and users.
        </p>
      </div>
      <UniMappingManager />
    </div>
  );
}
