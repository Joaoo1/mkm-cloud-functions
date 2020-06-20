const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const firestore = admin.firestore();

const moment = require('moment');
moment.locale('pt-br');

function dateGroupByMonth(momentDates) {
  return momentDates.reduce((acc,obj) => {
    let dateMonth = obj.format('MMM YY');
    (acc[dateMonth] = acc[dateMonth] || []).push(obj.toDate().toString());
    return acc;
  }, {});
}

function updateSalesFromLast12Months(salesByMonth) {
  firestore.collection('dashboard').doc('salesFromLast12Months').set({salesByMonth, updatedAt: new Date()}, {merge:true});
}

exports.salesFromLast12Months = functions.https.onCall(async () => {
  let sales;
  const startDate = moment().set({year: moment().year() - 1, month: moment().month() }).startOf('month');
  try {
    const snapshot = await firestore.collection('vendas')
      .where('dataVenda', '>=', startDate)
      .orderBy('dataVenda', 'desc')
      .get();
    sales = snapshot.docs.map(s => s.data());
  }
  catch (error) {
    return error;
  }

  const saleDates = sales.map(sale => moment.unix(sale.dataVenda.seconds));
  const salesFilteredByMonth = dateGroupByMonth(saleDates);
  const numberSalesByMonth = Object.keys(salesFilteredByMonth).map(month => {
    return { month, sales: salesFilteredByMonth[month].length }
  })
  updateSalesFromLast12Months(numberSalesByMonth);
  return numberSalesByMonth;
});