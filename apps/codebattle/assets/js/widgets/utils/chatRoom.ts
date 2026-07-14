declare const process: { env: { NODE_ENV?: string } };

interface PrivateRoom {
  required?: boolean;
  expireTo?: number;
  [key: string]: unknown;
}

type PrivateRoomsByPage = Record<string, PrivateRoom[]>;

const uniqInstanceKey = process.env.NODE_ENV;

const daysAmount = 10;
const hoursAmount = 24;
const minutesAmount = 60;
const secondsAmount = 60;
const millisecondsAmount = 1000;

export const ttl = millisecondsAmount * secondsAmount * minutesAmount * hoursAmount * daysAmount;

export const calculateExpireDate = () => {
  const now = new Date();
  return now.getTime() + ttl;
};

export const getStorageKey = (userId: number | string | null | undefined) =>
  `${userId}-${uniqInstanceKey}-private-messages`;

const getAllPrivateRooms = (key?: string): PrivateRoomsByPage =>
  JSON.parse(localStorage.getItem(key as string) as string) || {};

export const getPrivateRooms = (pageName: string, key: string) => {
  const allPrivateRooms = getAllPrivateRooms(key);
  const pagePrivateRooms = allPrivateRooms[pageName];
  return pagePrivateRooms || [];
};

export const filterPrivateRooms = (rooms: PrivateRoom[]) =>
  rooms.filter(({ required }) => !required);

export const clearExpiredPrivateRooms = (key: string) => {
  const now = new Date();
  const allPrivateRooms = getAllPrivateRooms(key);
  const allActualPrivateRooms = Object.entries(allPrivateRooms)
    .map(([pageName, pagePrivateRooms]): [string, PrivateRoom[]] => {
      const actualPrivateRooms = pagePrivateRooms.filter(
        (room) => (room.expireTo as number) > now.getTime(),
      );
      return [pageName, actualPrivateRooms];
    })
    .filter(([, pagePrivateRooms]) => pagePrivateRooms.length > 0);

  if (allActualPrivateRooms.length === 0) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, JSON.stringify(Object.fromEntries(allActualPrivateRooms)));
  }
};

export const updatePrivateRooms = (rooms: PrivateRoom[], pageName: string, key: string) => {
  if (rooms.length === 0) {
    return;
  }
  const allPrivateRooms = getAllPrivateRooms();
  const updatedPrivateRooms = { ...allPrivateRooms, [pageName]: rooms };
  localStorage.setItem(key, JSON.stringify(updatedPrivateRooms));
};
