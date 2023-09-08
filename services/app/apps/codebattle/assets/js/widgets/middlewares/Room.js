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

export const getStorageKey = (userId) => `${userId}-${uniqInstanceKey}-private-messages`;

const getAllPrivateRooms = (key) => JSON.parse(localStorage.getItem(key)) || {};

export const getPrivateRooms = (pageName, key) => {
  const allPrivateRooms = getAllPrivateRooms(key);
  const pagePrivateRooms = allPrivateRooms[pageName];
  return pagePrivateRooms || [];
};

export const filterPrivateRooms = (rooms) => rooms.filter(({ required }) => !required);

export const clearExpiredPrivateRooms = (key) => {
  const now = new Date();
  const allPrivateRooms = getAllPrivateRooms(key);
  const allActualPrivateRooms = Object.entries(allPrivateRooms)
    .map(([pageName, pagePrivateRooms]) => {
      const actualPrivateRooms = pagePrivateRooms.filter((room) => room.expireTo > now.getTime());
      return [pageName, actualPrivateRooms];
    })
    .filter(([, pagePrivateRooms]) => pagePrivateRooms.length > 0);

  if (allActualPrivateRooms.length === 0) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, JSON.stringify(Object.fromEntries(allActualPrivateRooms)));
  }
};

export const updatePrivateRooms = (rooms, pageName, key) => {
  if (rooms.length === 0) {
    return;
  }
  const allPrivateRooms = getAllPrivateRooms();
  const updatedPrivateRooms = { ...allPrivateRooms, [pageName]: rooms };
  localStorage.setItem(key, JSON.stringify(updatedPrivateRooms));
};
