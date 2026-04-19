export function getApiErrorMessage(error, fallbackMessage = 'Something went wrong. Please try again later.') {
  const responseData = error?.response?.data;

  if (typeof responseData === 'string' && responseData.trim()) {
    return responseData;
  }

  if (responseData?.detail) {
    return responseData.detail;
  }

  if (responseData?.error) {
    return responseData.error;
  }

  if (error?.message) {
    return error.message;
  }

  return fallbackMessage;
}

export function formatFieldErrors(errorData, fieldLabels = {}) {
  if (!errorData || typeof errorData !== 'object') {
    return '';
  }

  return Object.entries(errorData)
    .flatMap(([field, value]) => {
      const fieldLabel = fieldLabels[field] || field;
      const messages = Array.isArray(value) ? value : [value];
      return messages
        .filter(Boolean)
        .map((message) => `${fieldLabel}: ${message}`);
    })
    .join('\n');
}
