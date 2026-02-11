const { z } = require("zod");

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, "Nieprawidlowe ID");

const registerSchema = z
  .object({
    mail: z.string().email("Nieprawidlowy email"),
    login: z.string().min(3, "Login za krotki").max(30, "Login za dlugi"),
    password: z.string().min(8, "Haslo za krotkie").max(72, "Haslo za dlugie"),
    confirmPassword: z.string().min(8, "Potwierdzenie hasla za krotkie").max(72, "Potwierdzenie hasla za dlugie")
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasla nie sa identyczne",
    path: ["confirmPassword"]
  });

const loginSchema = z.object({
  loginOrEmail: z.string().min(1, "Podaj login lub email"),
  password: z.string().min(1, "Podaj haslo")
});

const updateProfileSchema = z.object({
  login: z.string().min(3, "Login za krotki").max(30, "Login za dlugi").optional()
});

const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, "Podaj stare haslo"),
    newPassword: z.string().min(8, "Nowe haslo za krotkie").max(72, "Nowe haslo za dlugie"),
    confirmPassword: z.string().min(8, "Potwierdzenie hasla za krotkie").max(72, "Potwierdzenie hasla za dlugie")
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Nowe hasla nie sa identyczne",
    path: ["confirmPassword"]
  })
  .refine((data) => data.newPassword !== data.oldPassword, {
    message: "Nowe haslo musi byc rozne od starego",
    path: ["newPassword"]
  });

const createPostSchema = z.object({
  topicId: objectId,
  content: z.string().min(1, "Tresc posta nie moze byc pusta").max(5000, "Tresc posta za dluga"),
  replyTo: objectId.optional().nullable(),
  tags: z.array(objectId).optional()
});

const updatePostSchema = z.object({
  content: z.string().min(1, "Tresc posta nie moze byc pusta").max(5000, "Tresc posta za dluga")
});

const createTopicSchema = z.object({
  name: z.string().min(1, "Nazwa tematu nie moze byc pusta").max(120, "Nazwa tematu za dluga").optional(),
  description: z.string().max(1000, "Opis za dlugi").optional(),
  tags: z.array(objectId).optional(),
  parentId: objectId.optional().nullable()
});

const updateTopicSchema = z.object({
  name: z.string().min(1, "Nazwa tematu nie moze byc pusta").max(120, "Nazwa tematu za dluga").optional(),
  description: z.string().max(1000, "Opis za dlugi").optional()
});

const blockUserSchema = z.object({
  topicId: objectId,
  userId: objectId,
  exceptTopicIds: z.array(objectId).optional()
});

const moderatorChangeSchema = z.object({
  topicId: objectId,
  userId: objectId
});

const createTagSchema = z.object({
  name: z.string().min(2, "Nazwa tagu za krotka").max(40, "Nazwa tagu za dluga"),
  topicId: objectId.optional().nullable()
});

const updateTagSchema = z.object({
  name: z.string().min(2, "Nazwa tagu za krotka").max(40, "Nazwa tagu za dluga")
});

const deleteUserSchema = z.object({
  userId: objectId
});

module.exports = {
  objectId,
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  createPostSchema,
  updatePostSchema,
  createTopicSchema,
  updateTopicSchema,
  blockUserSchema,
  moderatorChangeSchema,
  createTagSchema,
  updateTagSchema,
  deleteUserSchema
};
