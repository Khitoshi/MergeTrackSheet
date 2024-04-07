const token = PropertiesService.getScriptProperties().getProperty('TOKEN');

// APIリクエストのオプションを設定
const options = {
    "method": "get",
    "headers": {
        "Authorization": "token " + token,
        "Accept": "application/vnd.github.v3+json"
    },
    "muteHttpExceptions": true
};

function _getObject(api) {
    let response = null;
    //tokenがない場合も一応使えるようにする
    if (token === null || token === "") {
        response = UrlFetchApp.fetch(api);
    } else {
        response = UrlFetchApp.fetch(api, options);
    }
    return JSON.parse(response.getContentText());
}

function _populateSheet(sheet, index, item, base_api, state_enum) {
    if (item.body !== null) {
        const issue_number_match = item.body.match(/#(\d+)/);
        if (issue_number_match !== null) {
            const issue_number = issue_number_match[1];
            sheet.getRange(`A${index}`).setValue(issue_number);
        }
    }

    sheet.getRange(`B${index}`).setValue(item.number);
    sheet.getRange(`C${index}`).setValue(item.url);
    sheet.getRange(`D${index}`).setValue(item.title);

    const reviews_info = _getObject(`${base_api}/${item.number}/reviews`);

    const review_state = reviews_info.map(review => `${review.user.login} : ${review.state}`).join('\n');
    sheet.getRange(`E${index}`).setValue(review_state);

    //マージになる条件は、マージされた日付があるかつ、ステータスがclosedの場合
    sheet.getRange(`F${index}`).setValue(state_enum[item.merged_at !== null && item.state === "closed" ? 'merged' : item.state]);
}

function myFunction() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    console.log(ss.getName());
    const sheet = ss.getSheetByName("シート1");

    const owner = sheet.getRange("D2").getValues();
    const repo = sheet.getRange("D3").getValues();
    const base_branch = sheet.getRange("D4").getValues();

    const base_api = "https://api.github.com/repos/" + owner + "/" + repo + "/pulls";
    console.log("base_api: " + base_api);
    const items = _getObject(base_api + "?base=" + base_branch + "&state=all");

    const state_enum = {
        closed: 'マージをしないでクローズ',
        merged: 'マージ済み',
        open: '対応中',
    }

    let index = 9;
    items.forEach(item => {
        _populateSheet(sheet, index, item, base_api, state_enum);
        index++;
    });
}