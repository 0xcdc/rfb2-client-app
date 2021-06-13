export function stubClient(householdId) {
  return {
    id: -1,
    householdId,
    name: '',
    disabled: -1,
    raceId: 0,
    birthYear: '',
    genderId: 0,
    refugeeImmigrantStatus: -1,
    speaksEnglish: -1,
    militaryStatusId: 0,
    ethnicityId: 0,
  };
}

export function stubHousehold() {
  return {
    id: -1,
    address1: '',
    address2: '',
    cityId: 0,
    zip: '',
    incomeLevelId: 0,
    note: '',
    clients: [],
  };
}
