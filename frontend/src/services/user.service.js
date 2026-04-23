import api from "./api";

export const getUserProfile = async () => {
  const res = await api.get("/users/profile");
  return res.data;
};

export const updateProfileImage = async (imageUri) => {
  const formData = new FormData();
  const filename = imageUri.split("/").pop();
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : "image/jpeg";

  formData.append("image", {
    uri: imageUri,
    name: filename,
    type,
  });
  const res = await api.put("/users/profile/image", formData, {
  headers: { "Content-Type": "multipart/form-data" },
  timeout: 30000, // 30 seconds
 });
  return res.data;
};