/**
 * MongoDB API synchronization client for PDF reader app.
 * Connects to Express backend API (/api/reader) backing MongoDB database "PDF" and collection "reader".
 */

export async function fetchRemoteReaders() {
  try {
    const res = await fetch('/api/reader');
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.warn('[MongoDB Sync] Could not fetch remote readers:', err.message);
    return [];
  }
}

export async function saveRemoteReader(bookData) {
  try {
    const res = await fetch('/api/reader', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookData)
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.warn('[MongoDB Sync] Could not save remote reader:', err.message);
    return null;
  }
}

export async function updateRemoteProgress(id, currentPage, totalPages) {
  try {
    const res = await fetch(`/api/reader/${id}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPage, totalPages })
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.warn('[MongoDB Sync] Could not update remote progress:', err.message);
    return null;
  }
}

export async function updateRemoteAnnotations(id, annotations, bookmarks) {
  try {
    const res = await fetch(`/api/reader/${id}/annotations`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ annotations, bookmarks })
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.warn('[MongoDB Sync] Could not update remote annotations:', err.message);
    return null;
  }
}

export async function deleteRemoteReader(id) {
  try {
    const res = await fetch(`/api/reader/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch (err) {
    console.warn('[MongoDB Sync] Could not delete remote reader:', err.message);
    return false;
  }
}
