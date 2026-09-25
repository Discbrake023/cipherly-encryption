/**
 * API Utility Helpers
 */

/**
 * Send a JSON POST request and return JSON response.
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Terjadi kesalahan pada server.");
  }
  return data;
}

/**
 * Send a multipart/form-data POST request.
 * @param {string} url
 * @param {FormData} formData
 * @returns {Promise<Response>}
 */
export async function postFormData(url, formData) {
  const res = await fetch(url, {
    method: "POST",
    body: formData,
  });
  return res;
}

/**
 * Trigger browser download for a Blob object.
 * @param {Blob} blob
 * @param {string} filename
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
