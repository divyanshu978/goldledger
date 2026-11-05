const { Prisma } = require("@prisma/client");

const karigarInclude = {
  wastageRules: {
    orderBy: { itemCategory: "asc" },
  },
};

function toKarigarResponse(karigar) {
  return {
    id: karigar.id,
    karigarCode: karigar.karigarCode,
    name: karigar.name,
    phone: karigar.phone,
    isActive: karigar.isActive,
    createdAt: karigar.createdAt,
    updatedAt: karigar.updatedAt,
    wastageRules: karigar.wastageRules.map((rule) => ({
      id: rule.id,
      itemCategory: rule.itemCategory,
      allowedWastagePercent: rule.allowedWastagePercent.toString(),
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    })),
  };
}

function isUniqueConstraintError(error) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function createKarigar(prisma, data) {
  try {
    const karigar = await prisma.$transaction(async (transaction) => {
      const created = await transaction.karigar.create({
        data: {
          karigarCode: data.karigarCode,
          name: data.name,
          phone: data.phone,
          wastageRules: {
            create: data.wastageRules.map((rule) => ({
              itemCategory: rule.itemCategory,
              allowedWastagePercent: rule.allowedWastagePercent,
            })),
          },
        },
        include: karigarInclude,
      });

      return created;
    });

    return toKarigarResponse(karigar);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      error.statusCode = 409;
      error.publicMessage = "Karigar code or wastage rule already exists";
    }
    throw error;
  }
}

async function listKarigars(prisma, { page, pageSize, search, isActive }) {
  const where = {
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { karigarCode: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(isActive === undefined ? {} : { isActive }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.karigar.findMany({
      where,
      include: karigarInclude,
      orderBy: [{ name: "asc" }, { karigarCode: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.karigar.count({ where }),
  ]);

  return {
    items: items.map(toKarigarResponse),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

async function getKarigar(prisma, id) {
  const karigar = await prisma.karigar.findUnique({
    where: { id },
    include: karigarInclude,
  });

  return karigar ? toKarigarResponse(karigar) : null;
}

async function updateKarigar(prisma, id, data) {
  try {
    const karigar = await prisma.$transaction(async (transaction) => {
      await transaction.karigar.update({
        where: { id },
        data: {
          ...(data.karigarCode === undefined ? {} : { karigarCode: data.karigarCode }),
          ...(data.name === undefined ? {} : { name: data.name }),
          ...(data.phone === undefined ? {} : { phone: data.phone }),
        },
      });

      if (data.wastageRules) {
        await transaction.wastageRule.deleteMany({ where: { karigarId: id } });
        await transaction.wastageRule.createMany({
          data: data.wastageRules.map((rule) => ({
            karigarId: id,
            itemCategory: rule.itemCategory,
            allowedWastagePercent: rule.allowedWastagePercent,
          })),
        });
      }

      return transaction.karigar.findUnique({
        where: { id },
        include: karigarInclude,
      });
    });

    return toKarigarResponse(karigar);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      error.statusCode = 409;
      error.publicMessage = "Karigar code or wastage rule already exists";
    }
    throw error;
  }
}

async function updateKarigarStatus(prisma, id, isActive) {
  const karigar = await prisma.karigar.update({
    where: { id },
    data: { isActive },
    include: karigarInclude,
  });

  return toKarigarResponse(karigar);
}

module.exports = {
  createKarigar,
  getKarigar,
  isUniqueConstraintError,
  listKarigars,
  toKarigarResponse,
  updateKarigar,
  updateKarigarStatus,
};
