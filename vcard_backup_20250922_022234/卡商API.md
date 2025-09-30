虚拟卡开放API对接文档

一、api安全访问控制
1、安全访问概述
开放api，采用ip白名单、用户token、数据AES加密，三种方式控制访问与数据的安全
正式对接前，用户提供访问api的ip地址，发放的token和AES key是
Please use the following information to integrate with our API:
a. Request Domain: [ https://openapi-hk.vccdaddy.com]
b. Request Token: [ w5Epkw0M257ocOwB ]
c. Encrypt AES Key: [ eoC31VaznV1ZBG6T ]



2、如何进行AES加密
1.	数据加密，采用AES的CBC模式，padding类型为pkcs7
2.	加密使用的iv，固定为16进制的"\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0A\x0B\x0C\x0D\x0E\x0F"
3.	加密后使用base64进行编码

3、如何进行数据传输，流程举例
1.	业务参数转成待加密的json格式，例如    {"test":"test"}
2.	进行AES加密，AES使用的key为"s3429EjAU9WK7cm4"，并使用base64编码，转换后的结果为   "CVW0KWKkzXmWIxqBVgpJbw=="，加密测试工具 https://gchq.github.io/CyberChef
 
3.	将加密后的字符串放到待传输json的data字段中
JSON
{
    "data": "CVW0KWKkzXmWIxqBVgpJbw=="
}
4.	在进行http请求的时候在header中添加oaToken字段，并赋值路淘提供的访问token
5.	以http的POST方式，通过http的body将第三步中的json整体发送
6.	请求返回数据为json格式，其中的data字段使用同样的方式进行加密，反向解密即可得到原始业务数据
请求的postman截图如下：
 
 
4、请求返回
字段名称	字段描述	是否必传	字段类型	举例	备注
code	返回码	必传	int	1	1  ： 成功
其他：失败
msg	返回信息	必传	string	"success"	
data	返回业务数据	必传	string	"bfKzWiGNU92CzWV3rhUc"	通过AES加密base64编码后的数据
返回样例：
JSON
{
    "code": 1,
    "msg": "card issue success",
    "data": "bfKzWiGNU92CzWV3rhUc"
}

二、卡片操作API
1、创建虚拟卡

多次卡请求路径：    /openapi/card/hk/multi_issue
请求数据字段：
字段名称	字段描述	是否必传	字段类型	举例	备注
amt	开卡金额	必传	string	"123.45"	最多支持2位小数
currency	货币类型	必传	string	"USD"	支持币种：USD,HKD,AUD,JPY,CAD,EUR,GBP,SGD,THB,NZD,MYR,IDR,CNH,PHP
expdate	过期时间	必传	string	"2022-12-12"	时间要求大于30天，小于4年
remark	卡备注	可选	string	"abc12345"	可以填写业务订单号等,最长32位
productCode	产品代码	必传	string	"E0000001"	不传的话，默认开香港卡
香港卡："E0000001"
英国卡："G0000001"
其他product code请询问运营人员
cardBin	card bin	可选	string	"123456"	特定product code可选参数(E系列，G系列不需要传)，不传默认随机选择
sub_id	子账户id	可选	string	"SW1131e820240429145842"	子账户id
request_id	请求ID	可选	string	"123456"	Request id每个用户每次请求不能重复，可以在请求出现异常的时候，确认请求是否成功
在获取卡片详情接口可以传入
待加密json举例：
JSON
{
    "amt": "123.45",
    "expdate": "2022-11-11",
    "currency": "USD",
    "remark": "abc12345"
}
返回数据字段：
字段名称	字段描述	字段类型	举例	备注
userId	用户ID	string	"12345"	
cardId	卡片ID	string	"12345"	
cardNo	卡号	string	"12345"	
expDate	卡片过期时间	string	"12/23"	
cvv	卡片cvv	string	"123"	
cardBal	卡片余额	string	"123.45"	
curId	卡片币种	string	"USD"	
tradeNo	卡片流水号	string	"12345"	

JSON
{
    "userId": "1234", 
    "cardNo": "xxxxxxxxxxxxxxxx", 
    "cvv": "123", 
    "expDate": "12/34", 
    "cardBal": "8.88", 
    "curId": "USD", 
    "cardId": "860e09ba20241121155919", 
    "tradeNo": "1859506865513590785", 
    "sub_id": null, 
    "request_id": ""
}
2、卡片充值相关
2.1、卡片充值
请求路径：  /openapi/card/hk/recharge
请求数据字段：
字段名称	字段描述	是否必传	字段类型	举例	备注
cardId	卡片ID	必传	string	"12345"	创建虚拟卡返回的cardId
amt	充值金额	必传	string	"123.45"	最多支持2位小数
request_id	请求ID	可选	string	"123456"	Request id每个用户每次请求不能重复，可以在请求出现异常的时候，确认请求是否成功
返回数据字段：
字段名称	字段描述	字段类型	举例	备注
userId	用户ID	string	"12345"	
amount	用户充值金额	string	"12345"	
cardBal	卡片余额	string	"123.45"	
curId	卡片币种	string	"USD"	
2.2、卡片充值请求查询
请求路径：  /openapi/card/recharge_check
请求数据字段：
字段名称	字段描述	是否必传	字段类型	举例	备注
cardId	卡片ID	必传	string	"12345"	创建虚拟卡返回的cardId
request_id	请求ID	必传	string	"123456"	充值请求传递的request_id，可以查询充值是否成功
返回数据字段：
字段名称	字段描述	字段类型	举例	备注
card_id	卡片ID	string	"12345"	
request_id	请求ID	string	"12345"	
bal_type	卡片币种	string	"USD"	
total_amt	卡片充值前余额	string	"123.45"	
recharge_amt	充值金额	string	"3.0000"	
op_time	充值时间	string	"2024-09-26 13:38:58+08"	

3、卡片提现相关
3.1、卡片提现
请求路径：  /openapi/card/withdraw
请求数据字段：
字段名称	字段描述	是否必传	字段类型	举例	备注
cardId	卡片ID	必传	string	"12345"	创建虚拟卡返回的cardId
amt	提现金额	必传	string	"123.45"	最多支持2位小数
request_id	请求ID	可选	string	"123456"	Request id每个用户每次请求不能重复，可以在请求出现异常的时候，确认请求是否成功
返回数据字段：
字段名称	字段描述	字段类型	举例	备注
userId	用户ID	string	"12345"	
amount	用户提现金额	string	"12345"	
cardBal	卡片余额	string	"123.45"	
curId	卡片币种	string	"USD"	
3.2、卡片提现请求查询
请求路径：  /openapi/card/withdraw_check
请求数据字段：
字段名称	字段描述	是否必传	字段类型	举例	备注
cardId	卡片ID	必传	string	"12345"	创建虚拟卡返回的cardId
request_id	请求ID	必传	string	"123456"	提现请求传递的request_id，可以查询提现是否成功
返回数据字段：
字段名称	字段描述	字段类型	举例	备注
card_id	卡片ID	string	"12345"	
request_id	请求ID	string	"12345"	
bal_type	卡片币种	string	"USD"	
total_amt	卡片提现前余额	string	"123.45"	
withdraw_amt	提现金额	string	"3.0000"	
op_time	提现时间	string	"2024-09-26 13:38:58+08"	

4、卡片释放相关
4.1、卡片释放
请求路径：  /openapi/card/hk/release
请求数据字段：
字段名称	字段描述	是否必传	字段类型	举例	备注
cardId	卡片ID	必传	string	"12345"	创建虚拟卡返回的cardId
request_id	请求ID	可选	string	"123456"	Request id每个用户每次请求不能重复，可以在请求出现异常的时候，确认请求是否成功
返回数据字段：
字段名称	字段描述	字段类型	举例	备注
releaseBal	卡片剩余金额	string	"123.45"	剩余金额会返回到用户余额
4.2、卡片释放请求查询
请求路径：  /openapi/card/release_check
请求数据字段：
字段名称	字段描述	是否必传	字段类型	举例	备注
cardId	卡片ID	必传	string	"12345"	创建虚拟卡返回的cardId
request_id	请求ID	必传	string	"123456"	释放请求传递的request_id，可以查询释放是否成功
返回数据字段：
字段名称	字段描述	字段类型	举例	备注
card_id	卡片ID	string	"12345"	
request_id	请求ID	string	"12345"	
bal_type	卡片币种	string	"USD"	
release_amt	释放金额	string	"3.0000"	
op_time	释放时间	string	"2024-09-26 13:38:58+08"	

5、卡片详情相关
5.1 获取卡片详情
请求路径：  /openapi/card/hk/info
请求数据字段：
字段名称	字段描述	是否必传	字段类型	举例	备注
cardId	卡片ID	
二选一	string	"12345"	创建虚拟卡返回的cardId
request_id	请求ID		string	"123456"	创建卡请求传入的request_id，可以确认卡片是否创建成功。
如果传request_id，cardId可以为空
返回数据字段：
字段名称	字段描述	字段类型	举例	备注
cardId	卡片ID	string	"12345"	
cardNo	卡号	string	"12345"	
expDate	卡片过期时间	string	"12/24"	月/年
cvv	卡片cvv	string	"123"	
cardBal	卡片余额	string	"123.45"	
curId	卡片币种	string	"USD"	
remark	卡片备注	string	"订单号"	开卡时填写的remark
status	卡片状态	string	"1"	"0":已注销
"1":已激活
"2":已冻结
"3":已过期
"4":已锁定
"9":待激活
usedAmt	已使用金额	string	"123.45"	
totalAmt	总金额	string	"12345.67"	
sub_id	子账户id	string	"SW1131e820240429145842"	
card_email	卡片绑定的email	string	"12345@qq.com"	
5.2 更新卡片email
请求路径：  /openapi/card/update_email
请求数据字段：
字段名称	字段描述	是否必传	字段类型	举例	备注
cardId	卡片ID	必传	string	"12345"	创建虚拟卡返回的cardId
card_email	需要绑定的email 地址	必传	string	"123456@qq.com"	
返回数据字段：
字段名称	字段描述	字段类型	举例	备注
cardId	卡片ID	string	"12345"	
card_email	绑定的email 地址	string	"123456@qq.com"	
6、卡片冻结
请求路径：  /openapi/card/freeze
请求数据字段：
字段名称	字段描述	是否必传	字段类型	举例	备注
cardId	卡片ID	必传	string	"12345"	创建虚拟卡返回的cardId
返回数据字段：
字段名称	字段描述	字段类型	举例	备注
cardId	卡片ID	string	"123.45"	创建虚拟卡返回的cardId
status	卡片状态	string	"1"	同卡片详情状态
7、卡片激活
请求路径：  /openapi/card/activate
请求数据字段：
字段名称	字段描述	是否必传	字段类型	举例	备注
cardId	卡片ID	必传	string	"12345"	创建虚拟卡返回的cardId
返回数据字段：
字段名称	字段描述	字段类型	举例	备注
cardId	卡片ID	string	"123.45"	创建虚拟卡返回的cardId
status	卡片状态	string	"1"	同卡片详情状态
8、获取用户余额
请求路径：  /openapi/user/hk/get_bal
请求数据字段：
传只有大括号的空json，"{}"
返回数据字段：
字段名称	字段描述	字段类型	举例	备注
hk_bal	香港卡余额	map		
bal_list	各个币种余额列表	list		
ccy	余额币种	string		
pendingAmt	冻结金额	string		
acctBal	账户余额	string		
actBal	可用余额	string		
返回字段解密后举例：
JSON
{
    "hk_bal": {
        "bal_list": [
            {
                    "ccy": "USD",
                    "pendingAmt": "499.95",
                    "acctBal": "1499.95",
                    "actBal": "1000"
            }
        ]
    }
}
9、获取卡片授权(auth)信息
请求路径：  /openapi/card/hk/get_auth
请求数据字段：
字段名称	字段描述	是否必传	字段类型	举例	备注
cardId	卡片ID	必传	string	"12345"	创建虚拟卡返回的cardId
start	第几页数据	必传	string	"1"	
返回数据字段：
字段名称	字段描述	字段类型	举例	备注
pageInfo	数据分页信息	map		
total	总数据条数	int		
current	当前页数	int		
size	每页条数	int		
list	auth信息列表	list		
txnId	交易ID	string		
originTxnId	原始交易ID	string		授权撤销时对应的原交易ID
cardId	卡片流水号	string		原始卡ID，注意这个不是卡片ID，历史问题
txnType	交易类型	string		A：授权
D：授权撤销
txnStatus	交易状态	string		0：失败
1：成功
txnCcy	交易币种	string		
txnAmt	交易金额	decimal		
billCcy	账单币种	string		
billAmt	账单金额	decimal		
authCode	授权码	string		
merchName	商户名称	string		
merchCtry	商户国家	string		
mcc	商家业务类型	string		
declineReason	拒绝原因	string		
txnTime	交易时间	string		
clearingDate	清算日期	string		
sub_id	子账户ID	string		
forcePost		bool		
pre_auth		bool		
biz_type	业务类型	string		01  提现
30  查询余额
99  消费
real_card_id	卡片ID	string		创建虚拟卡返回的cardId
返回数据举例：
JSON
{
        "pageInfo": {
            "total": 1,
            "current": 1,
            "size": 100
        },
        "list": [
            {
                "billCcy": "USD",
                "merchName": "EXPEDIA 72392451661043 EXPEDIA.CN ESP ",
                "clearingDate": "2022-09-19",
                "txnType": "A",
                "mcc": "4722 Travel Agencies, Tour Operators",
                "txnCcy": "CNY",
                "billAmt": 75.52,
                "txnStatus": "1",
                "cardId": "1571773237683429378",
                "txnTime": "2022-09-19T16:15:30.983",
                "originTxnId": "0",
                "txnAmt": 527.99,
                "merchCtry": "ESP",
                "txnId": "A1571774975501815810"
            }
        ]
    }
10、获取卡片结算(settle)信息
请求路径：  /openapi/card/hk/get_settle
请求数据字段：
字段名称	字段描述	是否必传	字段类型	举例	备注
cardId	卡片ID	必传	字符串	"12345"	创建虚拟卡返回的cardId
start	第几页数据	必传	字符串	"1"	
返回数据字段：
字段名称	字段描述	字段类型	举例	备注
pageInfo	数据分页信息	map		
total	总数据条数	int		
current	当前页数	int		
size	每页条数	int		
list	settle信息列表	list		
txnId	结算交易ID	string		
authTxnId	关联授权ID	string		
cardId	卡片流水号	string		原始卡ID，注意这个不是卡片ID，历史问题
txnType	交易类型	string		C：消费
R：退款
txnCcy	交易币种	string		
txnAmt	交易金额	decimal		
billCcy	账单币种	string		
billAmt	账单金额	decimal		
merchName	商户名称	string		
merchCtry	商户国家	string		
mcc	商家业务类型	string		
clearingDate	清算日期	string		
trade_note	旅游订单备注	string		
biz_type	业务类型	string		01  提现
99  消费
real_card_id	卡片ID	string		创建虚拟卡返回的cardId
返回数据举例：
JSON
{
        "pageInfo": {
            "total": 2,
            "current": 1,
            "size": 100
        },
        "list": [
            {
                "billCcy": "USD",
                "billAmt": -75.47,
                "merchName": "EXPEDIA 72392451661043 EXPEDIA.CN ESP ",
                "cardId": "1571773237683429378",
                "authTxnId": "A1571774975501815810",
                "clearingDate": "2022-09-20",
                "txnType": "R",
                "mcc": "4722 Travel Agencies, Tour Operators",
                "txnAmt": -527.99,
                "txnId": "F1572121779421708289",
                "txnCcy": "CNY",
                "trade_note": "123123test"
            },
            {
                "billCcy": "USD",
                "billAmt": 75.52,
                "merchName": "EXPEDIA 72392451661043 EXPEDIA.CN ESP ",
                "cardId": "1571773237683429378",
                "authTxnId": "A1571774975501815810",
                "clearingDate": "2022-09-19",
                "txnType": "C",
                "mcc": "4722 Travel Agencies, Tour Operators",
                "txnAmt": 527.99,
                "txnId": "F1571864633350946817",
                "txnCcy": "CNY"
            }
        ]
    }
11、交易auth信息回调
用户提供auth信息回调接口，路淘通过POST方式，在body中将auth数据以json格式发送给用户
请求数据字段：
字段名称	字段描述	字段类型	举例	备注
uid	用户ID	string		
txnId	交易ID	string		
originTxnId	原始交易ID	string		授权撤销时对应的原交易ID
cardId	卡片ID	string		
orgCardId	卡片流水号	string		原始卡片ID
txnType	交易类型	string		A：授权
D：授权撤销
txnStatus	交易状态	string		0：失败
1：成功
txnCcy	交易币种	string		
txnAmt	交易金额	string		
billCcy	账单币种	string		
billAmt	账单金额	string		
authCode	授权码	string		
merchName	商户名称	string		
merchCtry	商户国家	string		
mcc	商家业务类型	string		
txnTime	交易时间	string		
declineReason	失败原因	string		
forcePost	Force post	bool		
preAuth	Pre auth	bool		
bizType	业务类型	string		01  提现
30  查询余额
99  消费
请求数据样例：
JSON
{
  "billCcy": "CNH",
  "merchName": "ABC",
  "txnType": "A",
  "mcc": "4722 Travel Agencies, Tour Operators",
  "txnCcy": "CNY",
  "billAmt": "1850.24",
  "txnStatus": "1",
  "cardId": "63672365",
  "txnTime": "2022-11-07T08:02:22.468",
  "originTxnId": "0",
  "merchCtry": "ESP",
  "txnAmt": "1829.36",
  "txnId": "A1589407877",
  "uid": "123456789",
  "orgCardId": "1589090",
  "forcePost": false,
}
12、交易settle信息回调
用户提供settle信息回调接口，路淘通过POST方式，在body中将settle数据以json格式发送给用户
返回数据字段：
字段名称	字段描述	字段类型	举例	备注
uid	用户ID	string		
txnId	结算交易ID	string		
authTxnId	关联授权ID	string		
cardId	卡片ID	string		
orgCardId	卡片流水号	string		原始卡片ID
txnType	交易类型	string		C：消费
R：退款
txnCcy	交易币种	string		
txnAmt	交易金额	string		
billCcy	账单币种	string		
billAmt	账单金额	string		
merchName	商户名称	string		
merchCtry	商户国家	string		
mcc	商家业务类型	string		
clearingDate	清算日期	string		
bizType	业务类型	string		01  提现
99  消费
请求数据样例：
JSON
{
  "billCcy": "CNH",
  "billAmt": "454.34",
  "merchName": "ABC ",
  "merchCtry": "USA",
  "authTxnId": "A15892880935",
  "cardId": "636723659b",
  "clearingDate": "2022-11-07",
  "txnType": "C",
  "mcc": "4722 Travel Agencies, Tour Operators",
  "txnAmt": "449.21",
  "txnCcy": "CNY",
  "txnId": "F1589442809",
  "uid": "100082",
  "orgCardId": "158909042"
}
13、按日期范围获(卡片创建时间)取卡片信息
请求路径：  /openapi/v1/card/card_list
请求数据字段：
字段名称	字段描述	是否必传	字段类型	举例	备注
date_start	起始日期	必传	string	"2023-09-01"	
date_end	结束日期	必传	string	"2023-09-30"	日期间隔不大于30天
page	第几页数据	必传	int	1	每页最多100条数据，返回的数据列表为空时表示已经没有新的数据了
返回数据字段：
字段名称	字段描述	字段类型	举例	备注
page	当前页数	int		
page_size	每页最大条数	int		
key_list	卡片列表字段	list		
card_id	卡片ID	string		
org_card_id	卡片流水号	string		
card_type	卡片类型	int		0:未知
1: 单次卡
2:多次卡
status	卡片状态	int
		0:已注销
1:已激活
2:已冻结
3:已过期
4:已锁定
remark	备注	string		
sub_id	子账号ID	string		
create_time	卡片创建时间	string		
card_category	卡片分类	int		1虚拟卡
2实体卡
card_list	卡片列表数据	list		
返回样例：
JSON
{ "page": 1, 
  "page_size": 100, 
  "key_list": ["card_id", "org_card_id", "card_type", "status", "remark"], 
  "card_list": [
        ["6501711988fab5dd52785358", "1701873790883147778", 1, 0, "test"],
        ["6502f6a0f95bc3886b3c89ea", "1702292043769290753", 1, 0, "test"],             
        ["650af051abcf980913f7f201", "1704484295002980354", 2, 0, "test"]
]
}

14、按日期范围获取授权(auth)信息
请求路径：  /openapi/v1/card/auth_list
请求数据字段：
字段名称	字段描述	是否必传	字段类型	举例	备注
date_start	起始日期	必传	string	"2023-09-01"	
date_end	结束日期	必传	string	"2023-09-30"	日期间隔不大于30天
page	第几页数据	必传	int	1	每页最多100条数据，返回的数据列表为空时表示已经没有新的数据了
card_id	卡片ID	可选	string	"123456"	如果传card_id，则只返回对应卡片的数据
返回数据字段：
字段名称	字段描述	字段类型	举例	备注
page	当前页数	int		
page_size	每页最大条数	int		
total_count	总数	int		
key_list	auth列表字段	list		
card_id	卡片ID	string		
txn_id	交易ID	string		
txn_type	交易类型	string		A：授权
D：授权撤销
txn_status	交易状态	string		0：失败
1：成功
txn_time	交易时间	string		
txn_amt	交易金额	string		
txn_ccy	交易币种	string		
bill_amt	账单金额	string		
bill_ccy	账单币种	string		
mcc	商家业务类型	string		
merch_name	商户名称	string		
merch_ctry	商户国家	string		
origin_txn_id	原始交易ID	string		授权撤销时对应的原交易ID
decline_reason	拒绝原因	string		
auth_code	授权码	string		
sub_id	子账户ID	string		
force_post	Force post	bool		
pre_auth	Pre auth	bool		
biz_type	业务类型	string		01  提现
30  查询余额
99  消费
auth_list	auth数据列表	list		

JSON
{
    "page": 1, 
    "page_size": 100, 
    "total_count": 2,
    "key_list": ["card_id", "txn_id", "txn_type", "txn_status", "txn_time", "txn_amt", "txn_ccy", "bill_amt", "bill_ccy", "mcc", "merch_name", "merch_ctry", "origin_txn_id", "decline_reason"], 
    "auth_list": [
        ["63a27d3e59cfe6fe5b1bc298", "A1697503188240027650", "A", "1", "2023-09-01 14:54:33.013", "12.0000", "USD", "12.0000", "USD", "5734 Computer Software Stores", "DIGITALOCEAN.COM", "NLD", "0", ""], 
        ["6483ed807e4119208ddbb8d3", "A1698016873458106370", "A", "1", "2023-09-03 00:55:45.087", "150.5900", "USD", "150.5900", "USD", "7399 Miscellaneous Business Services", "Amazon web services", "USA", "0", ""]
    ]
}
15、按日期范围获取结算(settle)信息
请求路径：  /openapi/v1/card/settle_list
请求数据字段：
字段名称	字段描述	是否必传	字段类型	举例	备注
date_start	起始日期	必传	string	"2023-09-01"	
date_end	结束日期	必传	string	"2023-09-30"	日期间隔不大于30天
page	第几页数据	必传	int	1	每页最多100条数据，返回的数据列表为空时表示已经没有新的数据了

返回数据字段：
字段名称	字段描述	字段类型	举例	备注
page	当前页数	int		
page_size	每页最大条数	int		
total_count	总数	int		
key_list	settle列表字段	list		
card_id	卡片ID	string		
txn_id	交易ID	string		
txn_type	交易类型	string		C：消费
R：退款
txn_amt	交易金额	string		
txn_ccy	交易币种	string		
bill_amt	账单金额	string		
bill_ccy	账单币种	string		
auth_txn_id	授权ID	string		
clearing_date	结算日期	string		
mcc	商家业务类型	string		
merch_name	商户名称	string		
merch_ctry	商户国家	string		
auth_code	授权码	string		
sub_id	子账户ID	string		
trade_note	旅游订单备注	string		
biz_type	业务类型	string		01  提现
99  消费
settle_list	settle数据列表			

JSON
{
    "page": 1, 
    "page_size": 100, 
    "total_count": 2,
    "key_list": ["card_id", "txn_id", "txn_type", "txn_amt", "txn_ccy", "bill_amt", "bill_ccy", "auth_txn_id", "clearing_date", "mcc", "merch_name", "merch_ctry", "auth_code", "sub_id", "trade_note"], 
    "settle_list": [
    ["4552317e20240710095958", "TEST1775418800961146900", "C", "100.0000", "EUR", "117.4300", "USD", "TEST1773225110558388275", "2024-06-16", "4511 Airlines, Air Carriers", "JIN AIR JINAIR.COM GBR", "IRL", "126816", null, "apitest001"],         
    ["4552317e20240710095958", "TEST1775418800961146901", "C", "100.0000", "EUR", "117.4300", "USD", "TEST1773225110558388275", "2024-06-17", "4511 Airlines, Air Carriers", "JIN AIR JINAIR.COM GBR", "IRL", "126816", "SW74306620240418140155", null]
]
}

