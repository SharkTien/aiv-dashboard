import FormBuilder from "./FormBuilder";

export default async function FormEditPage(ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const formId = Number(id);
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Form Builder</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Design and customize your form fields.
        </p>
      </div>
      <FormBuilder formId={formId} />
    </div>
  );
}
