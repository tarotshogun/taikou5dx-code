import string
from unittest import skip
from winreg import SaveKey
import requests
from bs4 import BeautifulSoup


def get_html(url: string):
    response = requests.get(url)
    if response.status_code == 200:
        return response.content


def find_table(html: string, identifier: string):
    html = BeautifulSoup(html, "html.parser")
    tables = html.findAll("table", {"class": "MsoNormalTable"})
    for table in tables:
        if identifier in table.text:
            return table
    else:
        assert("cannot find table")


# TODO(tarot-shogun): 大名家や商家は2回目に該当するテーブルを取ってくる必要があるので無理取得する
def find_second_table(html: string, identifier: string):
    html = BeautifulSoup(html, "html.parser")
    tables = html.findAll("table", {"class": "MsoNormalTable"})
    skip = True
    for table in tables:
        if identifier in table.text:
            if skip:
                skip = False
            else:
                return table
    else:
        assert("cannot find table")


def create_list_from_table(table):
    rows = table.findAll("tr")
    list = []
    for cell in rows:
        data = cell.find('p', {"class": "MsoNormal"})
        if data is not None:
            list.append(data.get_text())
    return list


def create_dict_from_list(list):
    objects = []
    for i in range(len(list)):
        objects.append({'id': i, 'name': list[i]})
    return objects


def get_dict_from_html(html: string, identifier: string):

    print(f">>> {identifier}")

    table = find_table(html, identifier)
    if table is None:
        print(f"table is None {identifier}")
        return

    list = create_list_from_table(table)
    if list is None:
        print(f"list is None {identifier}")
        return

    return create_dict_from_list(list)


def get_dict_from_html_second(html: string, identifier: string):

    print(f">>> {identifier}")

    if html is None:
        print(f"cannot get html {identifier}")
        return

    table = find_second_table(html, identifier)
    if table is None:
        print(f"table is None {identifier}")
        return

    list = create_list_from_table(table)
    if list is None:
        print(f"list is None {identifier}")
        return

    return create_dict_from_list(list)


def create_code_data_suggestion(path: string, dict):
    code_template = """{
      label: "@name",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "@number",
    },
    """
    if dict is None:
        return

    code = "items = ["
    for item in dict:
        code_block = code_template
        code_block = code_block.replace('@name', item["name"])
        code_block = code_block.replace('@number', str(item["id"]).zfill(4))
        code = code + code_block
    code = code + "];"

    with open(path, mode='w+', encoding="utf-8") as fso:
        fso.write(code)


if __name__ == '__main__':
    URL = 'https://www.gamecity.ne.jp/manual/KSjyrFfh/Taiko5DXEV_TC/contents/list.html'

    html = get_html(URL)

    create_code_data_suggestion(
        'person_data_out.txt', get_dict_from_html(html, "人物Ａ"))

    create_code_data_suggestion(
        'hub_data_out.txt', get_dict_from_html(html, "城Ａ"))

    create_code_data_suggestion(
        'city_data_out.txt', get_dict_from_html(html, "\n宇須岸\n"))

    create_code_data_suggestion(
        'castle_data_out.txt', get_dict_from_html(html, "\n勝山\n"))

    create_code_data_suggestion(
        'village_data_out.txt', get_dict_from_html(html, "\n黒脛巾\n"))

    create_code_data_suggestion(
        'sea_fort_data_out.txt', get_dict_from_html(html, "\n十三湊\n"))

    create_code_data_suggestion(
        'power_data_out.txt', get_dict_from_html(html, "\n勢力Ａ\n"))

    create_code_data_suggestion(
        'lords_data_out.txt', get_dict_from_html_second(html, "\n大名家Ａ\n"))

    create_code_data_suggestion(
        'merchant_data_out.txt', get_dict_from_html_second(html, "\n商家Ａ\n"))

    create_code_data_suggestion(
        'ninja_data_out.txt', get_dict_from_html_second(html, "\n黒脛巾衆\n"))

    create_code_data_suggestion(
        'pirate_data_out.txt', get_dict_from_html_second(html, "\n安東水軍\n"))

    create_code_data_suggestion(
        'army_data_out.txt', get_dict_from_html(html, "\n主人公軍団\n"))

    create_code_data_suggestion(
        'item_data_out.txt', get_dict_from_html(html, "\n松風\n"))

    create_code_data_suggestion(
        'region_data_out.txt', get_dict_from_html(html, "\n東北\n"))

    create_code_data_suggestion(
        'country_data_out.txt', get_dict_from_html(html, "\n蝦夷\n"))

    create_code_data_suggestion(
        'store_name_data_out.txt', get_dict_from_html(html, "\n鐙\n"))

    create_code_data_suggestion(
        'school_data_out.txt', get_dict_from_html(html, "主人公流派"))

    create_code_data_suggestion(
        'position_data_out.txt', get_dict_from_html(html, "主人公身分"))

    create_code_data_suggestion(
        'kanshoku_data_out.txt', get_dict_from_html(html, "佐渡守"))

    create_code_data_suggestion(
        'kani_data_out.txt', get_dict_from_html(html, "主人公官位"))

    create_code_data_suggestion(
        'koueki_area_data_out.txt', get_dict_from_html(html, "北みちのく"))

    create_code_data_suggestion(
        'weather_data_out.txt', get_dict_from_html(html, "晴れ"))

    create_code_data_suggestion(
        'image_effect_data_out.txt', get_dict_from_html(html, "フェードアウト"))

    create_code_data_suggestion(
        'army_target_data_out.txt', get_dict_from_html(html, "\n軍団\n"))

    create_code_data_suggestion(
        'army_plan_data_out.txt', get_dict_from_html(html, "拠点攻撃"))

    create_code_data_suggestion(
        'personal_category_data_out.txt', get_dict_from_html(html, "汎用ライバル"))

    create_code_data_suggestion(
        'scene_data_out.txt', get_dict_from_html(html, "城主の間"))

    create_code_data_suggestion(
        'field_background_data_out.txt', get_dict_from_html(html, "陸道"))

    create_code_data_suggestion(
        'event_still_data_out.txt', get_dict_from_html(html, "墨俣築城"))

    create_code_data_suggestion(
        'bgm_data_out.txt', get_dict_from_html(html, "メイン大名"))

    create_code_data_suggestion(
        'se_data_out.txt', get_dict_from_html(html, "キャンセル音"))

    pass
