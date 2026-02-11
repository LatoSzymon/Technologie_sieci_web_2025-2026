const formatZodError = (error) => {
  if (!error?.issues?.length) {
    return "Nieprawidlowe dane";
  }
  return error.issues.map((issue) => issue.message).join(", ");
};

const validate = (schema, data) => {
  const result = schema.safeParse(data);
  if (!result.success) {
    return { ok: false, message: formatZodError(result.error) };
  }
  return { ok: true, data: result.data };
};

module.exports = { validate };
