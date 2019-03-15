import { Query, Expire } from 'avenger-current';
import * as t from 'io-ts';
import { API } from './helpers';

export const searchParams = Query({
  cacheStrategy: new Expire(2000),
  params: {
    searchId: t.union([t.string, t.undefined])
  },
  fetch: ({ searchId }) =>
    searchId
      ? API.availableVehicleController_readQuery({ id: searchId })
      : Promise.resolve(null)
});

export const availableVehicle = Query({
  cacheStrategy: new Expire(2000),
  params: {
    selectedFareId: t.union([t.string, t.undefined])
  },
  fetch: ({ selectedFareId }) =>
    selectedFareId
      ? API.availableVehicleController_read({ id: selectedFareId })
      : Promise.resolve(null)
});

export const specialEquipments = Query({
  cacheStrategy: new Expire(2000),
  params: {},
  dependencies: {
    searchParams,
    availableVehicle
  },
  fetch: ({ searchParams, availableVehicle }) => {
    const MILLIS_IN_DAY = 1000 * 60 * 60 * 24;
    return availableVehicle && searchParams
      ? API.locationsController_searchSpecialEquipments({
          location: availableVehicle.pickUpLocation.oagCode,
          duration: Math.floor(
            (searchParams.dropOffLocalDate.getTime() -
              searchParams.pickUpLocalDate.getTime()) /
              MILLIS_IN_DAY
          )
        })
      : Promise.resolve(null);
  }
});
