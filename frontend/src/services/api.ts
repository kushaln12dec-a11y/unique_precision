export const fetchHello = async () => {
  try {
    const res = await fetch("/api/hello");
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  } catch (error) {
    console.error("Error fetching hello:", error);
    throw error;
  }
};
  