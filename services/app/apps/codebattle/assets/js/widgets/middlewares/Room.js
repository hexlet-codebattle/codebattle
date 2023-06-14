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

const getAllPrivateRooms = () => JSON.parse(localStorage.getItem('private_rooms')) || {};

export const getPrivateRooms = pageName => {
  const allPrivateRooms = getAllPrivateRooms();
  const pagePrivateRooms = allPrivateRooms[pageName];

  return pagePrivateRooms || [];
};

export const clearExpiredPrivateRooms = () => {
  const now = new Date();
  const allPrivateRooms = getAllPrivateRooms();
  const allActualPrivateRooms = Object.entries(allPrivateRooms)
    .map(([pageName, pagePrivateRooms]) => {
      const actualPrivateRooms = pagePrivateRooms.filter(room => (
        room.ttl > now.getTime()
      ));
      return [pageName, actualPrivateRooms];
    })
    .filter(([, pagePrivateRooms]) => pagePrivateRooms.length > 0);

  if (allActualPrivateRooms.length === 0) {
    localStorage.removeItem('private_rooms');
  } else {
    localStorage.setItem('private_rooms', JSON.stringify(Object.fromEntries(allActualPrivateRooms)));
  }
};

export const updatePrivateRooms = (rooms, pageName) => {
  if (rooms.length === 0) {
    return;
  }
  const allPrivateRooms = getAllPrivateRooms();
  const updatedPrivateRooms = { ...allPrivateRooms, [pageName]: rooms };
  localStorage.setItem('private_rooms', JSON.stringify(updatedPrivateRooms));
};
