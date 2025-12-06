export const encrypt = (text) => {
  return Buffer.from(text).toString("base64");
};

export const decrypt = (text) => {
  return Buffer.from(text, "base64").toString("utf8");
};
