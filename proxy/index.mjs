import http from 'http'
import forbidden from './forbidden.mjs'

const port = +process.env.PORT || 22825,
    host = process.env.TDOMAIN || 'daemon',
    tport = +process.env.TPORT || 22825,
    auth = `Basic ${Buffer.from(`${process.env.RPCUSER || 'anonymous'}:${process.env.RPCPASS || 'anonymous'}`).toString('base64')}`;

function getRequestBody(req){
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => (data += chunk));
        req.on('end', () => resolve(data));
        req.on('error', reject)
    })
}

function proxy(data){
    return new Promise((resolve, reject) => {
        const req = http.request(`http://${host}:${tport}/`, {
            method: 'POST',
            headers: { Authorization: auth },
        }, res => getRequestBody(res).then(resolve).catch(reject));
        req.on('error', reject);
        req.end(JSON.stringify(data))
    })
}

function forbiddenObj(data){
    return {
        id: data.id,
        result: null,
        error: {
            code: -32601,
            message: forbidden[data.method],
        }
    }
}

http.createServer(async (req, res) => {
    res.writeHead(200, { 'Access-Control-Allow-Origin': '*' });
    let data = {};
    if(req.method === 'POST') try{
        data = JSON.parse(await getRequestBody(req))
    } catch(e){}
    if(Array.isArray(data)){
        const toReq = [],
            toRes = [];
        for(const e of data){
            if(e && e.method in forbidden){
                if(e.id) toRes.push(forbiddenObj(e));
            } else toReq.push(e)
        }
        let reqNotNotifyCount = 0,
            resNotNotifyCount = 0;
        for(const { id } of toReq) if(id !== undefined) reqNotNotifyCount++;
        for(const { id } of toRes) if(id !== undefined) resNotNotifyCount++;
        if(!resNotNotifyCount && !reqNotNotifyCount) return res.end();
        let reqData = await proxy(toReq);
        if(!reqNotNotifyCount) reqData = [];
        else reqData = JSON.parse(reqData);
        res.end(JSON.stringify(toRes.concat(reqData)))
    } else if(data && data.method in forbidden){
        res.end(JSON.stringify(forbiddenObj(data)))
    } else res.end(await proxy(data))
}).listen(port)
