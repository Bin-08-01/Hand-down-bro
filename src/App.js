import './App.css';
import Sound from "./assets/audio/sound.mp3";
import {Howl} from 'howler';
import {useEffect, useRef} from "react";

const tf = require('@tensorflow/tfjs');
const mobilenet = require('@tensorflow-models/mobilenet');
const knnClassifier = require('@tensorflow-models/knn-classifier');

const sound = new Howl({
    src: [Sound],
    html5: true
});


const NOT_TOUCH_LB = 'not_touch';
const TOUCHED_LB = 'touched';
const TRAINING_TIME = 100;
const CONFIDENT_PERCENT = 0.6;

function App() {
    const video = useRef();
    const classifier = useRef();
    const mbnetModule = useRef();
    const canPlaySound = useRef(true);

    const init = async () =>{
        console.log("init ");
        await setupCamera();
        console.log(2);

        mbnetModule.current = await mobilenet.load();
        classifier.current = knnClassifier.create();
        console.log("Done");
    }

    const setupCamera = () =>{
        return new Promise((resole, reject)=>{
            navigator.getUserMedia = navigator.getUserMedia ||
                navigator.webkitGetUserMedia ||
                navigator.mozGetUserMedia ||
                navigator.msGetUserMedia;
            if(navigator.getUserMedia){
                navigator.getUserMedia(
                    {
                        video: true,
                    },
                    stream => {
                        video.current.srcObject = stream;
                        video.current.addEventListener('loadeddata', resole());
                    },
                    error => reject(error)
                );
            }else{
                reject();
            }
        })
    }

    const train = async (label) =>{
        console.log(label);
        for(let i = 0; i<TRAINING_TIME; ++i){
            console.log((i+1)+"%");
            await training(label);
        }
    }

    const training = (label) =>{
        return new Promise(async (resolve) => {
            const embedding = mbnetModule.current.infer(
                video.current,
                true
            );
            classifier.current.addExample(embedding, label);
            await sleep(100);
            resolve();
        })
    }

    const run = async () =>{
        const embedding = mbnetModule.current.infer(
            video.current,
            true
        );
        const result = classifier.current.predictClass(embedding, 50);
        result.then(data=>{

            if(data.label === TOUCHED_LB && data.confidences['touched'] >= CONFIDENT_PERCENT){
                console.log('Touched');
                if(canPlaySound.current == true){
                    canPlaySound.current = false;
                    sound.play();
                }
            }
            else{
                console.log("Not touch");
            }
        })

        await sleep(200);
        run();
    }

    const sleep = (ms = 0) =>{
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    useEffect(()=>{
        init();
        sound.on('end', function(){
            canPlaySound.current = true;
        });
        return () => {

        }
    }, []);
    return (
        <div className="Main">
            <video ref={video} className={"video"} autoPlay></video>

            <div className={"control"}>
                <button className={"btn"} onClick={()=>{train(NOT_TOUCH_LB)}}>Train 1</button>
                <button className={"btn"} onClick={()=>{train(TOUCHED_LB)}}>Train 2</button>
                <button className={"btn"} onClick={()=>{run()}}>Run</button>
            </div>

        </div>
    );
}

export default App;
