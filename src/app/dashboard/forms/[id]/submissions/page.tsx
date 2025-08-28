// import SubmissionsViewer from "./SubmissionsViewer";

export default function FormSubmissionsPage({ params }: { params: { id: string } }) {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Form Submissions</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          View and manage form submissions.
        </p>
      </div>
      {/* <SubmissionsViewer formId={parseInt(params.id)} /> */}
    </div>
  );
}
