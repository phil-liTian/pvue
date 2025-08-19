const internalObjectProto = {}

export const createInternalObject = (): any =>
  Object.create(internalObjectProto)
